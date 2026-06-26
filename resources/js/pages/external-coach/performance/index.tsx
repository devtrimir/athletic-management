import { Form, Head, Link } from '@inertiajs/react';

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
    member: { full_name: string; member_code: string | null; pno: string | null };
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
    updates: Update[];
    performanceLevels: string[];
};

export default function ExternalCoachPerformanceIndex({
    assignments,
    updates,
    performanceLevels,
}: Props) {
    const { t } = useTranslation();

    return (
        <>
            <Head title={t('Performance updates')} />

            <main className="min-h-screen bg-background">
                <div className="mx-auto grid w-full max-w-5xl gap-6 px-4 py-6 sm:px-6 lg:grid-cols-[1fr_340px]">
                    <section className="space-y-4">
                        <header className="border-b pb-4">
                            <h1 className="text-xl font-semibold tracking-tight">
                                {t('Performance updates')}
                            </h1>
                            <p className="text-sm text-muted-foreground">
                                {t('Submit training progress for assigned athletes.')}
                            </p>
                        </header>

                        <div className="rounded-lg border">
                            {updates.map((update) => (
                                <div
                                    key={update.id}
                                    className="flex items-center justify-between gap-4 border-b p-4 last:border-b-0"
                                >
                                    <div>
                                        <div className="font-medium">{update.member.full_name}</div>
                                        <div className="text-sm text-muted-foreground">
                                            {update.update_date} · {update.sport.name}
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        {update.performance_score ? (
                                            <span className="text-sm">{update.performance_score}/10</span>
                                        ) : null}
                                        <Badge variant="outline">{t(update.review_status)}</Badge>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </section>

                    <Form
                        action="/external-coach/performance"
                        method="post"
                        className="space-y-4 rounded-lg border bg-card p-4"
                    >
                        {({ errors, processing }) => (
                            <>
                                <div className="grid gap-2">
                                    <Label htmlFor="external_coaching_assignment_id">
                                        {t('Assigned athlete')}
                                    </Label>
                                    <Select name="external_coaching_assignment_id" required>
                                        <SelectTrigger id="external_coaching_assignment_id">
                                            <SelectValue placeholder={t('Select athlete')} />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {assignments.map((assignment) => (
                                                <SelectItem key={assignment.id} value={String(assignment.id)}>
                                                    {assignment.member.full_name} · {assignment.sport.name}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    <InputError message={errors.external_coaching_assignment_id} />
                                </div>

                                <div className="grid gap-2">
                                    <Label htmlFor="update_date">{t('Date')}</Label>
                                    <Input id="update_date" name="update_date" type="date" required />
                                    <InputError message={errors.update_date} />
                                </div>

                                <div className="grid gap-2">
                                    <Label htmlFor="performance_level">{t('Performance level')}</Label>
                                    <Select name="performance_level">
                                        <SelectTrigger id="performance_level">
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
                                    <Label htmlFor="performance_score">{t('Performance score')}</Label>
                                    <Input id="performance_score" name="performance_score" type="number" min="1" max="10" />
                                    <InputError message={errors.performance_score} />
                                </div>

                                <div className="grid gap-2">
                                    <Label htmlFor="training_summary">{t('Training summary')}</Label>
                                    <Textarea id="training_summary" name="training_summary" required rows={4} />
                                    <InputError message={errors.training_summary} />
                                </div>

                                <div className="grid gap-2">
                                    <Label htmlFor="improvement_notes">{t('Improvement notes')}</Label>
                                    <Textarea id="improvement_notes" name="improvement_notes" rows={3} />
                                    <InputError message={errors.improvement_notes} />
                                </div>

                                <Button type="submit" disabled={processing || assignments.length === 0} className="w-full">
                                    {t('Submit update')}
                                </Button>

                                <Button asChild variant="outline" className="w-full">
                                    <Link href="/external-coach/dashboard">{t('Dashboard')}</Link>
                                </Button>
                            </>
                        )}
                    </Form>
                </div>
            </main>
        </>
    );
}
