import { Form, Head, Link } from '@inertiajs/react';
import { ArrowLeft } from 'lucide-react';

import InputError from '@/components/input-error';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
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

type Update = {
    id: number;
    update_date: string;
    performance_level: string | null;
    performance_score: number | null;
    training_summary: string;
    improvement_notes: string | null;
    injury_or_fitness_notes: string | null;
    next_focus: string | null;
    review_status: string;
    review_remarks: string | null;
    member: { full_name: string; member_code: string | null; pno: string | null };
    external_coach: { name: string; email: string | null; phone: string | null };
    sport: { name: string };
    reviewer: { name: string } | null;
};

type Props = {
    update: Update;
    reviewActions: string[];
};

export default function ExternalCoachPerformanceUpdatesShow({ update, reviewActions }: Props) {
    const { t } = useTranslation();

    return (
        <>
            <Head title={t('Review performance update')} />

            <div className="grid gap-5 p-4 sm:p-6 lg:grid-cols-[1fr_340px]">
                <section className="space-y-4 rounded-lg border p-4">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                        <div>
                            <h1 className="text-xl font-semibold tracking-tight">
                                {t('Review performance update')}
                            </h1>
                            <p className="text-sm text-muted-foreground">
                                {update.member.full_name} · {update.sport.name}
                            </p>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                            <Badge variant="outline">{t(update.review_status)}</Badge>
                            <Button asChild variant="outline" size="sm">
                                <Link href="/external-coach-performance-updates">
                                    <ArrowLeft className="size-4" />
                                    {t('Back')}
                                </Link>
                            </Button>
                        </div>
                    </div>

                    <dl className="grid gap-3 text-sm sm:grid-cols-2">
                        <div>
                            <dt className="text-muted-foreground">{t('Date')}</dt>
                            <dd>{update.update_date}</dd>
                        </div>
                        <div>
                            <dt className="text-muted-foreground">{t('External coach')}</dt>
                            <dd>{update.external_coach.name}</dd>
                        </div>
                        <div>
                            <dt className="text-muted-foreground">{t('Performance level')}</dt>
                            <dd>{update.performance_level ? t(update.performance_level) : '-'}</dd>
                        </div>
                        <div>
                            <dt className="text-muted-foreground">{t('Performance score')}</dt>
                            <dd>{update.performance_score ?? '-'}</dd>
                        </div>
                    </dl>

                    <div className="space-y-3 text-sm">
                        <p>{update.training_summary}</p>
                        <p className="text-muted-foreground">{update.improvement_notes ?? ''}</p>
                        <p className="text-muted-foreground">{update.injury_or_fitness_notes ?? ''}</p>
                        <p className="text-muted-foreground">{update.next_focus ?? ''}</p>
                        <p>{update.review_remarks ?? ''}</p>
                    </div>
                </section>

                <Form
                    action={`/external-coach-performance-updates/${update.id}/review`}
                    method="post"
                    className="space-y-4 rounded-lg border bg-card p-4"
                >
                    {({ errors, processing }) => (
                        <>
                            <input type="hidden" name="_method" value="patch" />
                            <div className="grid gap-2">
                                <Label htmlFor="action">{t('Action')}</Label>
                                <Select name="action" required>
                                    <SelectTrigger id="action">
                                        <SelectValue placeholder={t('Select action')} />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {reviewActions.map((action) => (
                                            <SelectItem key={action} value={action}>
                                                {t(action)}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                <InputError message={errors.action} />
                            </div>

                            <div className="grid gap-2">
                                <Label htmlFor="review_remarks">{t('Review remarks')}</Label>
                                <Textarea id="review_remarks" name="review_remarks" rows={4} />
                                <InputError message={errors.review_remarks} />
                            </div>

                            <Button type="submit" disabled={processing} className="w-full">
                                {t('Save review')}
                            </Button>
                            <Button asChild variant="outline" className="w-full">
                                <Link href="/external-coach-performance-updates">{t('Back')}</Link>
                            </Button>
                        </>
                    )}
                </Form>
            </div>
        </>
    );
}
