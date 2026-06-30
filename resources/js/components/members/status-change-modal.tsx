import { useForm } from '@inertiajs/react';
import { store as storeStatus } from '@/actions/App/Http/Controllers/MemberStatusController';
import { DatePicker } from '@/components/date-picker';
import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useTranslation } from '@/hooks/use-translation';

type Props = {
    member: { id: number };
    open: boolean;
    onOpenChange: (open: boolean) => void;
};

const MEMBER_STATUS_OPTIONS = [
    'ACTIVE',
    'INACTIVE',
    'RESIGNED',
    'DISMISSED',
    'DECEASED',
    'RETIRED',
    'DOPING_DISQUALIFIED',
] as const;

function humanizeCode(value: string): string {
    return value
        .replace(/[_-]+/g, ' ')
        .toLowerCase()
        .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export function StatusChangeModal({ member, open, onOpenChange }: Props) {
    const { t } = useTranslation();
    const form = useForm({ status: '', effective_on: '', reason: '' });
    const statusLabel = (status: (typeof MEMBER_STATUS_OPTIONS)[number]) => {
        const translated = t(status);

        return translated === status ? humanizeCode(status) : translated;
    };

    function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        form.post(storeStatus.url(member), {
            onSuccess: () => {
                onOpenChange(false);
                form.reset();
            },
        });
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent aria-describedby={undefined}>
                <DialogHeader>
                    <DialogTitle>{t('Change status')}</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="mt-2 space-y-4">
                    <div className="grid gap-2">
                        <Label>
                            {t('New status')} <span className="text-destructive">*</span>
                        </Label>
                        <Select value={form.data.status} onValueChange={(v) => form.setData('status', v)}>
                            <SelectTrigger>
                                <SelectValue placeholder={t('Select status')} />
                            </SelectTrigger>
                            <SelectContent>
                                {MEMBER_STATUS_OPTIONS.map((s) => (
                                    <SelectItem key={s} value={s}>
                                        {statusLabel(s)}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <InputError message={form.errors.status} />
                    </div>
                    <div className="grid gap-2">
                        <Label>
                            {t('Effective date')} <span className="text-destructive">*</span>
                        </Label>
                        <DatePicker
                            value={form.data.effective_on}
                            onChange={(v) => form.setData('effective_on', v)}
                        />
                        <InputError message={form.errors.effective_on} />
                    </div>
                    <div className="grid gap-2">
                        <Label>{t('Reason')}</Label>
                        <Textarea
                            value={form.data.reason}
                            onChange={(e) => form.setData('reason', e.target.value)}
                            rows={3}
                        />
                        <InputError message={form.errors.reason} />
                    </div>
                    <div className="flex gap-3">
                        <Button type="submit" disabled={form.processing}>
                            {t('Save changes')}
                        </Button>
                        <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                            {t('Cancel')}
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
}
