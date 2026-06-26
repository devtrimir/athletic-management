import { Form, Head, Link } from '@inertiajs/react';
import { ArrowLeft, IdCard } from 'lucide-react';

import type { update } from '@/actions/App/Http/Controllers/ExternalCoachController';
import { index, store } from '@/actions/App/Http/Controllers/ExternalCoachController';
import Heading from '@/components/heading';
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
                description={t('Create a separate login profile for an approved external training coach.')}
                action={store()}
                statuses={statuses}
            />
        </>
    );
}

type FormProps = {
    title: string;
    description: string;
    action: ReturnType<typeof store> | ReturnType<typeof update>;
    statuses: string[];
    coach?: {
        id?: number;
        name: string;
        email: string;
        phone: string | null;
        status: string;
        experience_years: number | null;
        city: string | null;
        remarks: string | null;
    };
};

function ExternalCoachForm({ title, description, action, statuses, coach }: FormProps) {
    const { t } = useTranslation();

    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <Heading title={title} description={description} />
                <Button asChild variant="outline">
                    <Link href={index.url()}>
                        <ArrowLeft className="size-4" />
                        {t('Back')}
                    </Link>
                </Button>
            </div>

            <Form action={action} className="space-y-4">
                {({ errors, processing }) => (
                    <>
                        <div className="overflow-hidden rounded-xl border bg-card">
                            <div className="flex items-center gap-3 border-b px-6 py-4">
                                <div className="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                                    <IdCard className="size-4" />
                                </div>
                                <div>
                                    <h2 className="text-sm font-semibold">{t('Coach profile')}</h2>
                                    <p className="text-xs text-muted-foreground">{t('Identity, login, experience, and status')}</p>
                                </div>
                            </div>

                            <div className="space-y-5 p-6">
                                <div className="grid gap-5 sm:grid-cols-2">
                                    <div className="grid gap-2">
                                        <Label htmlFor="name">
                                            {t('Name')} <span className="text-destructive">*</span>
                                        </Label>
                                        <Input id="name" name="name" defaultValue={coach?.name} required />
                                        <InputError message={errors.name} />
                                    </div>
                                    <div className="grid gap-2">
                                        <Label htmlFor="email">
                                            {t('Email')} <span className="text-destructive">*</span>
                                        </Label>
                                        <Input id="email" name="email" type="email" defaultValue={coach?.email} required />
                                        <InputError message={errors.email} />
                                    </div>
                                    <div className="grid gap-2">
                                        <Label htmlFor="phone">{t('Phone')}</Label>
                                        <Input id="phone" name="phone" defaultValue={coach?.phone ?? ''} />
                                        <InputError message={errors.phone} />
                                    </div>
                                    <div className="grid gap-2">
                                        <Label htmlFor="password">
                                            {t('Password')} {!coach && <span className="text-destructive">*</span>}
                                        </Label>
                                        <Input id="password" name="password" type="password" required={!coach} />
                                        {coach ? <p className="text-xs text-muted-foreground">{t('Leave blank to keep the current password.')}</p> : null}
                                        <InputError message={errors.password} />
                                    </div>
                                    <div className="grid gap-2">
                                        <Label htmlFor="experience_years">{t('Experience years')}</Label>
                                        <Input
                                            id="experience_years"
                                            name="experience_years"
                                            type="number"
                                            min="0"
                                            max="80"
                                            defaultValue={coach?.experience_years ?? ''}
                                        />
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
                            </div>
                        </div>

                        <div className="flex justify-end gap-2">
                            <Button asChild variant="outline">
                                <Link href={index.url()}>{t('Cancel')}</Link>
                            </Button>
                            <Button type="submit" disabled={processing}>
                                {processing ? t('Saving...') : t('Save')}
                            </Button>
                        </div>
                    </>
                )}
            </Form>
        </div>
    );
}

export { ExternalCoachForm };
