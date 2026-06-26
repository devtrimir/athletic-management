import { Form, Head, Link } from '@inertiajs/react';
import { ArrowLeft, Dumbbell, History, Save, Star, TrendingUp, UserRound } from 'lucide-react';
import { useState } from 'react';

import type { ComboboxItem } from '@/components/combobox';
import { Combobox } from '@/components/combobox';
import { DatePicker } from '@/components/date-picker';
import InputError from '@/components/input-error';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useTranslation } from '@/hooks/use-translation';

type Assignment = {
    id: number;
    member: { full_name: string; pno: string | null };
    sport: { name: string };
};

type Update = {
    id: number;
    update_date: string;
    performance_level: string | null;
    performance_score: number | null;
    review_status: string;
    member: { full_name: string };
    sport: { name: string };
};

type Props = {
    assignments: Assignment[];
    selectedAssignmentId: string | null;
    updates: Update[];
    performanceLevels: string[];
};

export default function ExternalCoachPerformanceIndex({
    assignments,
    selectedAssignmentId,
    updates,
    performanceLevels,
}: Props) {
    const { t } = useTranslation();
    const [assignmentId, setAssignmentId] = useState(selectedAssignmentId ?? '');
    const [updateDate, setUpdateDate] = useState(todayIsoDate());
    const selectedAssignment = assignments.find((assignment) => String(assignment.id) === assignmentId);
    const assignmentItems: ComboboxItem[] = assignments.map((assignment) => ({
        value: String(assignment.id),
        label: assignment.member.full_name,
        badge: assignment.sport.name,
        description: assignment.member.pno ?? undefined,
    }));

    return (
        <>
            <Head title={t('Performance updates')} />

            <main className="min-h-screen bg-muted/20">
                <div className="mx-auto grid w-full max-w-6xl gap-4 px-3 py-4 pb-[calc(1rem+env(safe-area-inset-bottom))] sm:gap-6 sm:px-6 lg:grid-cols-[minmax(0,1fr)_380px] lg:py-8">
                    <section className="space-y-4 sm:space-y-5">
                        <header className="rounded-lg border bg-card px-4 py-4 shadow-sm sm:px-5">
                            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                                <div className="min-w-0">
                                    <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-normal text-muted-foreground">
                                        <TrendingUp className="size-3.5" />
                                        {t('External training portal')}
                                    </div>
                                    <h1 className="mt-1 text-xl font-semibold tracking-tight">
                                        {t('Performance updates')}
                                    </h1>
                                    <p className="mt-1 text-sm text-muted-foreground">
                                        {t('Record training progress for assigned athletes and keep updates ready for review.')}
                                    </p>
                                </div>

                                <Button asChild variant="outline" className="w-full sm:w-auto">
                                    <Link href="/external-coach/dashboard">
                                        <ArrowLeft className="size-4" />
                                        {t('Dashboard')}
                                    </Link>
                                </Button>
                            </div>
                        </header>

                        <SelectedAssignmentPanel assignment={selectedAssignment} />

                        <section className="hidden rounded-lg border bg-card shadow-sm lg:block">
                            <div className="flex items-center justify-between gap-3 border-b px-4 py-4 sm:px-5">
                                <div>
                                    <h2 className="text-sm font-semibold">{t('Recent updates')}</h2>
                                    <p className="text-xs text-muted-foreground">{t('Latest submitted performance notes from this portal.')}</p>
                                </div>
                                <Badge variant="secondary">{updates.length}</Badge>
                            </div>

                            {updates.length > 0 ? (
                                <div className="divide-y">
                                    {updates.map((update) => (
                                        <UpdateRow key={update.id} update={update} />
                                    ))}
                                </div>
                            ) : (
                                <div className="px-4 py-10 text-center sm:px-5">
                                    <div className="mx-auto flex size-10 items-center justify-center rounded-full bg-muted text-muted-foreground">
                                        <History className="size-5" />
                                    </div>
                                    <h3 className="mt-3 text-sm font-medium">{t('No performance updates yet')}</h3>
                                    <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">
                                        {t('Submitted progress updates will appear here after you save them.')}
                                    </p>
                                </div>
                            )}
                        </section>
                    </section>

                    <Form
                        action="/external-coach/performance"
                        method="post"
                        className="h-fit space-y-5 rounded-lg border bg-card p-4 shadow-sm sm:p-5"
                    >
                        {({ errors, processing }) => (
                            <>
                                <div className="border-b pb-4">
                                    <h2 className="text-sm font-semibold">{t('Submit update')}</h2>
                                    <p className="text-xs text-muted-foreground">{t('Choose an assigned athlete and record the current training progress.')}</p>
                                </div>

                                <div className="grid gap-2">
                                    <Label htmlFor="external_coaching_assignment_id">
                                        {t('Assigned athlete')}
                                    </Label>
                                    <input type="hidden" name="external_coaching_assignment_id" value={assignmentId} />
                                    <Combobox
                                        id="external_coaching_assignment_id"
                                        value={assignmentId}
                                        onValueChange={setAssignmentId}
                                        items={assignmentItems}
                                        placeholder={t('Search assigned athlete')}
                                        searchPlaceholder={t('Search by athlete, PNO, or sport')}
                                        emptyMessage={t('No assigned athlete found.')}
                                    />
                                    <InputError message={errors.external_coaching_assignment_id} />
                                </div>

                                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
                                    <div className="grid gap-2">
                                        <Label htmlFor="update_date">{t('Date')}</Label>
                                        <input type="hidden" name="update_date" value={updateDate} />
                                        <div className="flex gap-2">
                                            <DatePicker
                                                id="update_date"
                                                value={updateDate}
                                                onChange={setUpdateDate}
                                                placeholder={t('Select date')}
                                                className="min-w-0 flex-1"
                                            />
                                            <Button type="button" variant="outline" onClick={() => setUpdateDate(todayIsoDate())}>
                                                {t('Today')}
                                            </Button>
                                        </div>
                                        <InputError message={errors.update_date} />
                                    </div>

                                    <div className="grid gap-2">
                                        <Label htmlFor="performance_score">{t('Score')}</Label>
                                        <Input id="performance_score" name="performance_score" type="number" min="1" max="10" placeholder="1-10" />
                                        <InputError message={errors.performance_score} />
                                    </div>
                                </div>

                                <div className="grid gap-2">
                                    <Label htmlFor="performance_level">{t('Performance level')}</Label>
                                    <Select name="performance_level">
                                        <SelectTrigger id="performance_level" className="w-full">
                                            <SelectValue placeholder={t('Select level')} />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {performanceLevels.map((level) => (
                                                <SelectItem key={level} value={level}>
                                                    {t(level)}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    <InputError message={errors.performance_level} />
                                </div>

                                <div className="grid gap-2">
                                    <Label htmlFor="training_summary">{t('Training summary')}</Label>
                                    <Textarea id="training_summary" name="training_summary" required rows={5} placeholder={t('What was trained today?')} />
                                    <InputError message={errors.training_summary} />
                                </div>

                                <div className="grid gap-2">
                                    <Label htmlFor="improvement_notes">{t('Improvement notes')}</Label>
                                    <Textarea id="improvement_notes" name="improvement_notes" rows={3} placeholder={t('Observed improvement, concern, or next correction')} />
                                    <InputError message={errors.improvement_notes} />
                                </div>

                                <div className="sticky bottom-0 -mx-4 flex flex-col-reverse gap-2 border-t bg-card/95 px-4 py-3 backdrop-blur sm:static sm:mx-0 sm:flex-row sm:justify-end sm:bg-transparent sm:px-0 sm:pt-4 sm:backdrop-blur-none">
                                    <Button asChild variant="outline" className="w-full sm:w-auto">
                                        <Link href="/external-coach/dashboard">{t('Cancel')}</Link>
                                    </Button>
                                    <Button type="submit" disabled={processing || assignments.length === 0 || assignmentId === ''} className="w-full sm:w-auto">
                                        <Save className="size-4" />
                                        {t('Submit update')}
                                    </Button>
                                </div>
                            </>
                        )}
                    </Form>

                    <section className="rounded-lg border bg-card shadow-sm lg:hidden">
                        <div className="flex items-center justify-between gap-3 border-b px-4 py-4 sm:px-5">
                            <div>
                                <h2 className="text-sm font-semibold">{t('Recent updates')}</h2>
                                <p className="text-xs text-muted-foreground">{t('Latest submitted performance notes from this portal.')}</p>
                            </div>
                            <Badge variant="secondary">{updates.length}</Badge>
                        </div>

                        {updates.length > 0 ? (
                            <div className="divide-y">
                                {updates.map((update) => (
                                    <UpdateRow key={update.id} update={update} />
                                ))}
                            </div>
                        ) : (
                            <div className="px-4 py-10 text-center sm:px-5">
                                <div className="mx-auto flex size-10 items-center justify-center rounded-full bg-muted text-muted-foreground">
                                    <History className="size-5" />
                                </div>
                                <h3 className="mt-3 text-sm font-medium">{t('No performance updates yet')}</h3>
                                <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">
                                    {t('Submitted progress updates will appear here after you save them.')}
                                </p>
                            </div>
                        )}
                    </section>
                </div>
            </main>
        </>
    );
}

function SelectedAssignmentPanel({ assignment }: { assignment: Assignment | undefined }) {
    const { t } = useTranslation();

    return (
        <section className="rounded-lg border bg-card p-4 shadow-sm sm:p-5">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex min-w-0 items-start gap-3">
                    <div className="flex size-10 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
                        <UserRound className="size-5" />
                    </div>
                    <div className="min-w-0">
                        <div className="text-xs font-medium text-muted-foreground">{t('Selected athlete')}</div>
                        <h2 className="mt-1 truncate text-base font-semibold">
                            {assignment?.member.full_name ?? t('Choose an assigned athlete')}
                        </h2>
                        <div className="mt-2 flex flex-wrap gap-2 text-xs text-muted-foreground">
                            {assignment ? (
                                <>
                                    {assignment.member.pno ? <span className="rounded-md border px-2 py-1">{assignment.member.pno}</span> : null}
                                    <span className="rounded-md border px-2 py-1">{assignment.sport.name}</span>
                                </>
                            ) : (
                                <span>{t('Use the form panel to search and select an athlete.')}</span>
                            )}
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Dumbbell className="size-4" />
                    {assignment ? t('Ready for update') : t('Selection required')}
                </div>
            </div>
        </section>
    );
}

function UpdateRow({ update }: { update: Update }) {
    const { t } = useTranslation();

    return (
        <article className="grid gap-3 px-4 py-4 sm:px-5 md:grid-cols-[minmax(0,1fr)_160px] md:items-center">
            <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                    <h3 className="min-w-0 truncate font-medium">{update.member.full_name}</h3>
                    <Badge variant="outline">{t(update.review_status)}</Badge>
                </div>
                <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                    <span>{formatDate(update.update_date)}</span>
                    <span>·</span>
                    <span>{update.sport.name}</span>
                    {update.performance_level ? (
                        <>
                            <span>·</span>
                            <span>{t(update.performance_level)}</span>
                        </>
                    ) : null}
                </div>
            </div>

            <div className="flex items-center gap-2 md:justify-end">
                {update.performance_score ? (
                    <div className="inline-flex items-center gap-1 rounded-md border px-2 py-1 text-sm font-medium">
                        <Star className="size-3.5" />
                        {update.performance_score}/10
                    </div>
                ) : (
                    <span className="text-sm text-muted-foreground">{t('No score')}</span>
                )}
            </div>
        </article>
    );
}

function formatDate(value: string): string {
    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
        return value;
    }

    return new Intl.DateTimeFormat('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
    }).format(date);
}

function todayIsoDate(): string {
    const date = new Date();
    const localDate = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);

    return localDate.toISOString().slice(0, 10);
}
