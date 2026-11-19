import { Form, Head, Link } from '@inertiajs/react';
import { useRef } from 'react';
import PointSchemeController from '@/actions/App/Http/Controllers/Settings/PointSchemeController';
import Heading from '@/components/heading';
import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import { useTranslation } from '@/hooks/use-translation';
import { StatusBadge } from './index';

type Scheme = {
    id: number;
    version_number: number;
    name: string;
    notes: string | null;
    status: 'draft' | 'active' | 'retired';
    effective_from: string | null;
    published_at: string | null;
    results_scored: number;
};

type Level = {
    id: number;
    name_en: string;
    name_hi: string;
    is_active: boolean;
};

const RESULT_LABELS: Record<string, string> = {
    GOLD: 'Gold',
    SILVER: 'Silver',
    BRONZE: 'Bronze',
    PARTICIPATION: 'Participation',
};

export default function Show({
    scheme,
    levels,
    points,
    results,
    canEdit,
}: {
    scheme: Scheme;
    levels: Level[];
    points: Record<string, Record<string, number>>;
    results: string[];
    canEdit: boolean;
}) {
    const { t } = useTranslation();
    const publishing = useRef(false);

    return (
        <>
            <Head title={`${t('Points versions')} v${scheme.version_number}`} />

            <h1 className="sr-only">
                {t('Version')} {scheme.version_number}
            </h1>

            <div className="space-y-4">
                <div className="flex items-start justify-between gap-4">
                    <Heading
                        variant="small"
                        title={`v${scheme.version_number}`}
                        description={
                            canEdit
                                ? t(
                                      'Edit the points, set the date it starts applying and publish. Once published it is locked.',
                                  )
                                : t(
                                      'This version is published and locked. Start a new draft to change points.',
                                  )
                        }
                    />
                    <div className="flex items-center gap-2">
                        <StatusBadge status={scheme.status} />
                        <Button variant="outline" size="sm" asChild>
                            <Link href={PointSchemeController.index.url()}>
                                {t('All versions')}
                            </Link>
                        </Button>
                    </div>
                </div>

                <Form
                    {...PointSchemeController.update.form(scheme.id)}
                    transform={(data) => ({
                        ...data,
                        publish: publishing.current,
                    })}
                    disableWhileProcessing
                    className="space-y-5"
                >
                    {({ processing, errors }) => (
                        <>
                            <div className="grid gap-5 rounded-xl border bg-card p-6 sm:grid-cols-2">
                                <div className="grid gap-2">
                                    <Label htmlFor="name">{t('Name')}</Label>
                                    <Input
                                        id="name"
                                        name="name"
                                        defaultValue={scheme.name}
                                        maxLength={255}
                                        disabled={!canEdit}
                                        required
                                    />
                                    <InputError message={errors.name} />
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="effective_from">
                                        {t('Applies from')}
                                    </Label>
                                    <Input
                                        id="effective_from"
                                        name="effective_from"
                                        type="date"
                                        defaultValue={
                                            scheme.effective_from ?? ''
                                        }
                                        disabled={!canEdit}
                                    />
                                    <p className="text-xs text-muted-foreground">
                                        {canEdit
                                            ? t(
                                                  'Tournaments starting on or after this date are scored with this version. Needed to publish; today or later.',
                                              )
                                            : (scheme.effective_from ??
                                              t('Since the beginning'))}
                                    </p>
                                    <InputError
                                        message={errors.effective_from}
                                    />
                                </div>
                                <div className="grid gap-2 sm:col-span-2">
                                    <Label htmlFor="notes">{t('Notes')}</Label>
                                    <Textarea
                                        id="notes"
                                        name="notes"
                                        defaultValue={scheme.notes ?? ''}
                                        rows={2}
                                        disabled={!canEdit}
                                    />
                                </div>
                            </div>

                            <div className="overflow-hidden rounded-xl border">
                                <Table>
                                    <TableHeader>
                                        <TableRow className="bg-muted/50 hover:bg-muted/50">
                                            <TableHead>
                                                {t('Game level')}
                                            </TableHead>
                                            {results.map((result) => (
                                                <TableHead
                                                    key={result}
                                                    className="w-28 text-right"
                                                >
                                                    {t(RESULT_LABELS[result])}
                                                </TableHead>
                                            ))}
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {levels.map((level) => (
                                            <TableRow key={level.id}>
                                                <TableCell>
                                                    <div className="font-medium">
                                                        {level.name_en}
                                                        {!level.is_active &&
                                                            ` (${t('Inactive')})`}
                                                    </div>
                                                    <div className="text-xs text-muted-foreground">
                                                        {level.name_hi}
                                                    </div>
                                                </TableCell>
                                                {results.map((result) => (
                                                    <TableCell
                                                        key={result}
                                                        className="text-right"
                                                    >
                                                        <Input
                                                            name={`points[${level.id}][${result}]`}
                                                            type="number"
                                                            min={0}
                                                            max={65535}
                                                            defaultValue={
                                                                points[
                                                                    level.id
                                                                ]?.[result] ?? 0
                                                            }
                                                            disabled={!canEdit}
                                                            aria-label={`${level.name_en} ${RESULT_LABELS[result]}`}
                                                            className="ml-auto w-24 text-right tabular-nums"
                                                        />
                                                    </TableCell>
                                                ))}
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </div>
                            <InputError message={errors.points} />

                            {canEdit ? (
                                <div className="flex flex-wrap items-center justify-between gap-3">
                                    <Button
                                        type="submit"
                                        variant="outline"
                                        disabled={processing}
                                        onClick={() => {
                                            publishing.current = false;
                                        }}
                                    >
                                        {t('Save draft')}
                                    </Button>
                                    <Button
                                        type="submit"
                                        disabled={processing}
                                        onClick={(event) => {
                                            if (
                                                !window.confirm(
                                                    t(
                                                        'Publish this version? It will be locked and cannot be edited afterwards.',
                                                    ),
                                                )
                                            ) {
                                                event.preventDefault();

                                                return;
                                            }

                                            publishing.current = true;
                                        }}
                                    >
                                        {t('Publish')}
                                    </Button>
                                </div>
                            ) : (
                                <p className="text-sm text-muted-foreground">
                                    {t('Results scored with this version')}:{' '}
                                    {scheme.results_scored}
                                </p>
                            )}
                        </>
                    )}
                </Form>

                {canEdit && (
                    <Form
                        {...PointSchemeController.destroy.form(scheme.id)}
                        onBefore={() => window.confirm(t('Delete this draft?'))}
                    >
                        {({ processing }) => (
                            <Button
                                variant="ghost"
                                size="sm"
                                disabled={processing}
                                className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                            >
                                {t('Delete draft')}
                            </Button>
                        )}
                    </Form>
                )}
            </div>
        </>
    );
}

Show.layout = {
    breadcrumbs: [
        { title: 'Points versions', href: PointSchemeController.index.url() },
    ],
};
