import { Link, useForm } from '@inertiajs/react';
import { useState } from 'react';
import type { FormEvent } from 'react';
import InchargeController from '@/actions/App/Http/Controllers/InchargeController';
import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
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

export type InchargeFormRecord = {
    id?: number;
    full_name: string;
    pno: string;
    rank: string | null;
    mobile: string | null;
    email: string | null;
    is_active: boolean;
    remarks: string | null;
};

export type MasterOption = {
    code: string;
    name: string;
    short_name: string | null;
};

const OTHER_OPTION = '__other__';

function masterLabel(option: MasterOption): string {
    return option.short_name
        ? `${option.short_name} - ${option.name}`
        : option.name;
}

function resolveMasterSelection(
    value: string | null | undefined,
    options: MasterOption[],
): string {
    if (!value) {
        return '';
    }

    const match = options.find(
        (option) =>
            option.code === value ||
            option.name === value ||
            option.short_name === value,
    );

    return match ? match.code : OTHER_OPTION;
}

export function InchargeForm({
    incharge,
    ranks,
}: {
    incharge?: InchargeFormRecord;
    ranks: MasterOption[];
}) {
    const { t } = useTranslation();
    const [rankSelection, setRankSelection] = useState(
        resolveMasterSelection(incharge?.rank, ranks),
    );
    const [rankCustom, setRankCustom] = useState(
        rankSelection === OTHER_OPTION ? (incharge?.rank ?? '') : '',
    );
    const form = useForm({
        full_name: incharge?.full_name ?? '',
        pno: incharge?.pno ?? '',
        rank: incharge?.rank ?? '',
        mobile: incharge?.mobile ?? '',
        email: incharge?.email ?? '',
        is_active: incharge?.is_active ?? true,
        remarks: incharge?.remarks ?? '',
    });

    const submit = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();

        if (incharge?.id) {
            form.patch(InchargeController.update.url(incharge.id), {
                preserveScroll: true,
            });

            return;
        }

        form.post(InchargeController.store.url(), { preserveScroll: true });
    };

    return (
        <form onSubmit={submit} className="space-y-6">
            <div className="grid gap-4 rounded-md border bg-card p-4 sm:grid-cols-2">
                <div className="grid gap-2">
                    <Label htmlFor="full_name">{t('Officer name')}</Label>
                    <Input
                        id="full_name"
                        value={form.data.full_name}
                        onChange={(event) =>
                            form.setData('full_name', event.target.value)
                        }
                        required
                    />
                    <InputError message={form.errors.full_name} />
                </div>
                <div className="grid gap-2">
                    <Label htmlFor="pno">{t('PNO')}</Label>
                    <Input
                        id="pno"
                        value={form.data.pno}
                        onChange={(event) =>
                            form.setData('pno', event.target.value)
                        }
                        required
                    />
                    <InputError message={form.errors.pno} />
                </div>
                <div className="grid gap-2">
                    <Label htmlFor="rank">{t('Rank')}</Label>
                    <Select
                        value={rankSelection}
                        onValueChange={(value) => {
                            setRankSelection(value);
                            form.setData(
                                'rank',
                                value === OTHER_OPTION ? rankCustom : value,
                            );
                        }}
                    >
                        <SelectTrigger id="rank" className="h-9 w-full">
                            <SelectValue placeholder={t('Select rank')} />
                        </SelectTrigger>
                        <SelectContent>
                            {ranks.map((rank) => (
                                <SelectItem key={rank.code} value={rank.code}>
                                    {masterLabel(rank)}
                                </SelectItem>
                            ))}
                            <SelectItem value={OTHER_OPTION}>
                                {t('Other')}
                            </SelectItem>
                        </SelectContent>
                    </Select>
                    {rankSelection === OTHER_OPTION && (
                        <Input
                            className="mt-2 h-9"
                            value={rankCustom}
                            onChange={(event) => {
                                setRankCustom(event.target.value);
                                form.setData('rank', event.target.value.trim());
                            }}
                            maxLength={100}
                            placeholder={t('Enter rank')}
                        />
                    )}
                    <InputError message={form.errors.rank} />
                </div>
                <div className="grid gap-2">
                    <Label htmlFor="mobile">{t('Mobile')}</Label>
                    <Input
                        id="mobile"
                        value={form.data.mobile}
                        onChange={(event) =>
                            form.setData('mobile', event.target.value)
                        }
                    />
                    <InputError message={form.errors.mobile} />
                </div>
                <div className="grid gap-2">
                    <Label htmlFor="email">{t('Email')}</Label>
                    <Input
                        id="email"
                        type="email"
                        value={form.data.email}
                        onChange={(event) =>
                            form.setData('email', event.target.value)
                        }
                    />
                    <InputError message={form.errors.email} />
                </div>
                <div className="grid gap-2 sm:col-span-2">
                    <Label htmlFor="remarks">{t('Remarks')}</Label>
                    <Textarea
                        id="remarks"
                        value={form.data.remarks}
                        onChange={(event) =>
                            form.setData('remarks', event.target.value)
                        }
                    />
                    <InputError message={form.errors.remarks} />
                </div>
                <label className="flex items-center gap-2 text-sm font-medium">
                    <Checkbox
                        checked={form.data.is_active}
                        onCheckedChange={(checked) =>
                            form.setData('is_active', checked === true)
                        }
                    />
                    {t('Active')}
                </label>
            </div>

            <div className="flex justify-end gap-2">
                <Button asChild type="button" variant="outline">
                    <Link
                        href={
                            incharge?.id
                                ? InchargeController.show.url(incharge.id)
                                : InchargeController.index.url()
                        }
                    >
                        {t('Cancel')}
                    </Link>
                </Button>
                <Button type="submit" disabled={form.processing}>
                    {t('Save')}
                </Button>
            </div>
        </form>
    );
}
