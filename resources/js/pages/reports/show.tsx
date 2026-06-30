import { Head, router, setLayoutProps } from '@inertiajs/react';
import { useState } from 'react';
import * as MemberController from '@/actions/App/Http/Controllers/MemberController';
import * as ReportController from '@/actions/App/Http/Controllers/ReportController';
import Heading from '@/components/heading';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {
    Table,
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

const ALL = 'all';

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
    const isResignationDismissalReport =
        report.key === 'resignation-dismissal-log';

    setLayoutProps({
        breadcrumbs: [
            { title: t('Reports'), href: ReportController.index().url },
            { title: reportTitle },
        ],
    });

    const [sessionId, setSessionId] = useState<string>(
        filters.session_id ? String(filters.session_id) : ALL,
    );
    const [sportId, setSportId] = useState<string>(
        filters.sport_id ? String(filters.sport_id) : ALL,
    );
    const [tierId, setTierId] = useState<string>(
        filters.tier_id ? String(filters.tier_id) : ALL,
    );
    const [unitId, setUnitId] = useState<string>(
        filters.unit_id ? String(filters.unit_id) : ALL,
    );
    const [memberName, setMemberName] = useState<string>(
        typeof filters.member_name === 'string' ? filters.member_name : '',
    );
    const [pno, setPno] = useState<string>(
        typeof filters.pno === 'string' ? filters.pno : '',
    );

    function appliedExportQuery(): Record<string, string> {
        const query: Record<string, string> = { format: 'xlsx' };

        if (filters.session_id) {
            query.session_id = String(filters.session_id);
        }

        if (filters.sport_id) {
            query.sport_id = String(filters.sport_id);
        }

        if (filters.tier_id) {
            query.tier_id = String(filters.tier_id);
        }

        if (filters.unit_id) {
            query.unit_id = String(filters.unit_id);
        }

        if (
            isResignationDismissalReport &&
            typeof filters.member_name === 'string' &&
            filters.member_name.trim() !== ''
        ) {
            query.member_name = filters.member_name.trim();
        }

        if (
            isResignationDismissalReport &&
            typeof filters.pno === 'string' &&
            filters.pno.trim() !== ''
        ) {
            query.pno = filters.pno.trim();
        }

        return query;
    }

    function applyFilters() {
        const params: Record<string, string> = {};

        if (sessionId !== ALL) {
            params.session_id = sessionId;
        }

        if (sportId !== ALL) {
            params.sport_id = sportId;
        }

        if (tierId !== ALL) {
            params.tier_id = tierId;
        }

        if (unitId !== ALL) {
            params.unit_id = unitId;
        }

        if (isResignationDismissalReport && memberName.trim() !== '') {
            params.member_name = memberName.trim();
        }

        if (isResignationDismissalReport && pno.trim() !== '') {
            params.pno = pno.trim();
        }

        router.get(ReportController.show(report.key).url, params, {
            preserveScroll: true,
        });
    }

    function clearFilters() {
        setSessionId(ALL);
        setSportId(ALL);
        setTierId(ALL);
        setUnitId(ALL);
        setMemberName('');
        setPno('');

        router.get(
            ReportController.show(report.key).url,
            {},
            {
                preserveScroll: true,
            },
        );
    }

    function exportReport() {
        window.location.href = ReportController.exportMethod.url(report.key, {
            query: appliedExportQuery(),
        });
    }

    const columns =
        data.length > 0
            ? Object.keys(data[0]).filter(
                  (column) =>
                      !(
                          report.key === 'resignation-dismissal-log' &&
                          (column === 'member_code' || column === 'id')
                      ),
              )
            : [];
    const hasFilters =
        sessionId !== ALL ||
        sportId !== ALL ||
        tierId !== ALL ||
        unitId !== ALL ||
        memberName.trim() !== '' ||
        pno.trim() !== '';

    return (
        <>
            <Head title={reportTitle} />

            <div className="px-4 py-6">
                <Heading
                    title={reportTitle}
                    description={t(
                        'Review report records and apply filters to narrow the list.',
                    )}
                />

                {/* Filter bar — full UI built in P7-T14 */}
                <div className="mt-4 flex flex-wrap items-end gap-3">
                    {sessions.length > 0 && (
                        <Select value={sessionId} onValueChange={setSessionId}>
                            <SelectTrigger className="w-44">
                                <SelectValue placeholder={t('All Sessions')} />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value={ALL}>
                                    {t('All Sessions')}
                                </SelectItem>
                                {sessions.map((s) => (
                                    <SelectItem key={s.id} value={String(s.id)}>
                                        {s.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    )}

                    {sports.length > 0 && (
                        <Select value={sportId} onValueChange={setSportId}>
                            <SelectTrigger className="w-44">
                                <SelectValue placeholder={t('All Sports')} />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value={ALL}>
                                    {t('All Sports')}
                                </SelectItem>
                                {sports.map((s) => (
                                    <SelectItem key={s.id} value={String(s.id)}>
                                        {s.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    )}

                    {tiers.length > 0 && (
                        <Select value={tierId} onValueChange={setTierId}>
                            <SelectTrigger className="w-44">
                                <SelectValue placeholder={t('All Tiers')} />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value={ALL}>
                                    {t('All Tiers')}
                                </SelectItem>
                                {tiers.map((tier) => (
                                    <SelectItem
                                        key={tier.id}
                                        value={String(tier.id)}
                                    >
                                        {tier.label}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    )}

                    {units.length > 0 && (
                        <Select value={unitId} onValueChange={setUnitId}>
                            <SelectTrigger className="w-44">
                                <SelectValue placeholder={t('All Units')} />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value={ALL}>
                                    {t('All Units')}
                                </SelectItem>
                                {units.map((u) => (
                                    <SelectItem key={u.id} value={String(u.id)}>
                                        {u.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    )}

                    {isResignationDismissalReport && (
                        <>
                            <Input
                                className="h-9 w-52"
                                placeholder={t('Member name')}
                                value={memberName}
                                onChange={(e) => setMemberName(e.target.value)}
                            />
                            <Input
                                className="h-9 w-36"
                                placeholder={t('PNO')}
                                value={pno}
                                onChange={(e) => setPno(e.target.value)}
                            />
                        </>
                    )}

                    <Button onClick={applyFilters}>{t('Apply')}</Button>
                    {hasFilters && (
                        <Button variant="ghost" onClick={clearFilters}>
                            {t('Clear filters')}
                        </Button>
                    )}
                    <Button variant="outline" onClick={exportReport}>
                        {t('Export')}
                    </Button>
                </div>

                {/* Data table — full UI with Recharts + export in P7-T14 */}
                <div className="mt-6 overflow-x-auto rounded-md border">
                    {data.length === 0 ? (
                        <p className="p-6 text-sm text-muted-foreground">
                            {t('No data found')}
                        </p>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    {isResignationDismissalReport && (
                                        <TableHead>{t('S. No.')}</TableHead>
                                    )}
                                    {columns.map((col) => (
                                        <TableHead key={col}>{col}</TableHead>
                                    ))}
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {data.map((row, i) => (
                                    <TableRow key={i}>
                                        {isResignationDismissalReport && (
                                            <TableCell>{i + 1}</TableCell>
                                        )}
                                        {columns.map((col) => (
                                            <TableCell key={col}>
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
                                                        {renderCellValue(
                                                            row[col],
                                                        )}
                                                    </a>
                                                ) : (
                                                    renderCellValue(row[col])
                                                )}
                                            </TableCell>
                                        ))}
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    )}
                </div>
                <div className="mt-3 text-sm text-muted-foreground">
                    {t('Showing all :total records').replace(
                        ':total',
                        String(recordCount),
                    )}
                </div>
            </div>
        </>
    );
}
