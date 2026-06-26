import { Form, Head, Link } from '@inertiajs/react';

import InputError from '@/components/input-error';
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
    start_date: string;
    end_date: string;
    training_start_time: string | null;
    training_end_time: string | null;
    member: {
        member_code: string | null;
        pno: string | null;
        full_name: string;
    };
    training_venue: {
        name: string;
    };
    sport: {
        name: string;
    };
};

type Props = {
    assignments: Assignment[];
    attendanceStatuses: string[];
};

export default function ExternalCoachAttendance({ assignments, attendanceStatuses }: Props) {
    const { t } = useTranslation();

    return (
        <>
            <Head title={t('Training attendance')} />

            <main className="min-h-screen bg-background">
                <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-6 sm:px-6">
                    <header className="flex flex-col gap-4 border-b pb-4 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                            <h1 className="text-xl font-semibold tracking-tight">
                                {t('Training attendance')}
                            </h1>
                            <p className="text-sm text-muted-foreground">
                                {t('Submit attendance proof for assigned athletes.')}
                            </p>
                        </div>

                        <Button asChild variant="outline">
                            <Link href="/external-coach/dashboard">{t('Dashboard')}</Link>
                        </Button>
                    </header>

                    <Form
                        action="/external-coach/attendance"
                        method="post"
                        encType="multipart/form-data"
                        className="grid gap-5 rounded-lg border bg-card p-5"
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
                                                <SelectItem
                                                    key={assignment.id}
                                                    value={String(assignment.id)}
                                                >
                                                    {assignment.member.full_name} ·{' '}
                                                    {assignment.training_venue.name} ·{' '}
                                                    {assignment.sport.name}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    <InputError message={errors.external_coaching_assignment_id} />
                                </div>

                                <div className="grid gap-4 sm:grid-cols-2">
                                    <div className="grid gap-2">
                                        <Label htmlFor="attendance_date">{t('Date')}</Label>
                                        <Input
                                            id="attendance_date"
                                            name="attendance_date"
                                            type="date"
                                            required
                                        />
                                        <InputError message={errors.attendance_date} />
                                    </div>

                                    <div className="grid gap-2">
                                        <Label htmlFor="attendance_status">{t('Status')}</Label>
                                        <Select name="attendance_status" defaultValue="present">
                                            <SelectTrigger id="attendance_status">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {attendanceStatuses.map((status) => (
                                                    <SelectItem key={status} value={status}>
                                                        {t(status)}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                        <InputError message={errors.attendance_status} />
                                    </div>
                                </div>

                                <div className="grid gap-4 sm:grid-cols-3">
                                    <div className="grid gap-2">
                                        <Label htmlFor="submitted_latitude">{t('Latitude')}</Label>
                                        <Input
                                            id="submitted_latitude"
                                            name="submitted_latitude"
                                            inputMode="decimal"
                                        />
                                        <InputError message={errors.submitted_latitude} />
                                    </div>

                                    <div className="grid gap-2">
                                        <Label htmlFor="submitted_longitude">{t('Longitude')}</Label>
                                        <Input
                                            id="submitted_longitude"
                                            name="submitted_longitude"
                                            inputMode="decimal"
                                        />
                                        <InputError message={errors.submitted_longitude} />
                                    </div>

                                    <div className="grid gap-2">
                                        <Label htmlFor="submitted_gps_accuracy">
                                            {t('GPS accuracy')}
                                        </Label>
                                        <Input
                                            id="submitted_gps_accuracy"
                                            name="submitted_gps_accuracy"
                                            type="number"
                                            min="0"
                                        />
                                        <InputError message={errors.submitted_gps_accuracy} />
                                    </div>
                                </div>

                                <div className="grid gap-2">
                                    <Label htmlFor="submitted_photo">{t('Proof photo')}</Label>
                                    <Input
                                        id="submitted_photo"
                                        name="submitted_photo"
                                        type="file"
                                        accept="image/jpeg,image/png,image/webp"
                                        required
                                    />
                                    <InputError message={errors.submitted_photo} />
                                </div>

                                <div className="grid gap-2">
                                    <Label htmlFor="coach_remarks">{t('Remarks')}</Label>
                                    <Textarea id="coach_remarks" name="coach_remarks" rows={4} />
                                    <InputError message={errors.coach_remarks} />
                                </div>

                                <div className="flex justify-end">
                                    <Button type="submit" disabled={processing || assignments.length === 0}>
                                        {t('Submit attendance')}
                                    </Button>
                                </div>
                            </>
                        )}
                    </Form>
                </div>
            </main>
        </>
    );
}
