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

type Props = {
    statuses: string[];
};

export default function ExternalCoachesCreate({ statuses }: Props) {
    const { t } = useTranslation();

    return (
        <>
            <Head title={t('Create external coach')} />

            <ExternalCoachForm
                title={t('Create external coach')}
                action="/external-coaches"
                statuses={statuses}
            />
        </>
    );
}

type FormProps = {
    title: string;
    action: string;
    statuses: string[];
    methodOverride?: 'patch';
    coach?: {
        name: string;
        email: string;
        phone: string | null;
        status: string;
        experience_years: number | null;
        city: string | null;
        remarks: string | null;
    };
};

function ExternalCoachForm({ title, action, statuses, methodOverride, coach }: FormProps) {
    const { t } = useTranslation();

    return (
        <div className="mx-auto max-w-3xl p-4 md:p-6">
            <Form action={action} method="post" className="space-y-5 rounded-lg border bg-card p-5">
                {({ errors, processing }) => (
                    <>
                        {methodOverride ? <input type="hidden" name="_method" value={methodOverride} /> : null}
                        <div className="flex items-center justify-between gap-3">
                            <h1 className="text-xl font-semibold tracking-tight">{title}</h1>
                            <Button asChild variant="outline">
                                <Link href="/external-coaches">{t('Back')}</Link>
                            </Button>
                        </div>

                        <div className="grid gap-4 sm:grid-cols-2">
                            <div className="grid gap-2">
                                <Label htmlFor="name">{t('Name')}</Label>
                                <Input id="name" name="name" defaultValue={coach?.name} required />
                                <InputError message={errors.name} />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="email">{t('Email')}</Label>
                                <Input id="email" name="email" type="email" defaultValue={coach?.email} required />
                                <InputError message={errors.email} />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="phone">{t('Phone')}</Label>
                                <Input id="phone" name="phone" defaultValue={coach?.phone ?? ''} />
                                <InputError message={errors.phone} />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="password">{t('Password')}</Label>
                                <Input id="password" name="password" type="password" required={!coach} />
                                <InputError message={errors.password} />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="experience_years">{t('Experience')}</Label>
                                <Input id="experience_years" name="experience_years" type="number" min="0" max="80" defaultValue={coach?.experience_years ?? ''} />
                                <InputError message={errors.experience_years} />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="status">{t('Status')}</Label>
                                <Select name="status" defaultValue={coach?.status ?? 'active'} required>
                                    <SelectTrigger id="status">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {statuses.map((status) => (
                                            <SelectItem key={status} value={status}>
                                                {t(status)}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                <InputError message={errors.status} />
                            </div>
                        </div>

                        <div className="grid gap-2">
                            <Label htmlFor="city">{t('City')}</Label>
                            <Input id="city" name="city" defaultValue={coach?.city ?? ''} />
                            <InputError message={errors.city} />
                        </div>

                        <div className="grid gap-2">
                            <Label htmlFor="remarks">{t('Remarks')}</Label>
                            <Textarea id="remarks" name="remarks" rows={4} defaultValue={coach?.remarks ?? ''} />
                            <InputError message={errors.remarks} />
                        </div>

                        <div className="grid gap-2">
                            <Label htmlFor="status_reason">{t('Status reason')}</Label>
                            <Textarea id="status_reason" name="status_reason" rows={3} />
                            <InputError message={errors.status_reason} />
                        </div>

                        <div className="flex justify-end">
                            <Button type="submit" disabled={processing}>{t('Save')}</Button>
                        </div>
                    </>
                )}
            </Form>
        </div>
    );
}

export { ExternalCoachForm };
