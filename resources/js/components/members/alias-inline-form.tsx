import { router, useForm } from '@inertiajs/react';
import { Trash2 } from 'lucide-react';
import { useState } from 'react';
import {
    destroy as destroyAlias,
    store as storeAlias,
} from '@/actions/App/Http/Controllers/MemberAliasController';
import InputError from '@/components/input-error';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { useTranslation } from '@/hooks/use-translation';

type Alias = { id: number; alias: string; source: string };

type Props = {
    member: { id: number };
    aliases: Alias[] | undefined;
};

export function AliasInlineForm({ member, aliases }: Props) {
    const { t } = useTranslation();
    const [open, setOpen] = useState(false);
    const form = useForm({ alias: '', source: '' });

    function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        form.post(storeAlias.url(member), {
            onSuccess: () => {
                setOpen(false);
                form.reset();
            },
        });
    }

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <h3 className="text-sm font-medium">{t('Aliases')}</h3>
                <Dialog open={open} onOpenChange={setOpen}>
                    <DialogTrigger asChild>
                        <Button variant="outline" size="sm">
                            {t('Add alias')}
                        </Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>{t('Add alias')}</DialogTitle>
                        </DialogHeader>
                        <form
                            onSubmit={handleSubmit}
                            className="mt-2 space-y-4"
                        >
                            <div className="grid gap-2">
                                <Label>
                                    {t('Alias')}{' '}
                                    <span className="text-destructive">*</span>
                                </Label>
                                <Input
                                    value={form.data.alias}
                                    onChange={(e) =>
                                        form.setData('alias', e.target.value)
                                    }
                                    maxLength={255}
                                    required
                                />
                                <InputError message={form.errors.alias} />
                            </div>
                            <div className="grid gap-2">
                                <Label>
                                    {t('Source')}{' '}
                                    <span className="text-destructive">*</span>
                                </Label>
                                <Select
                                    value={form.data.source}
                                    onValueChange={(v) =>
                                        form.setData('source', v)
                                    }
                                >
                                    <SelectTrigger>
                                        <SelectValue
                                            placeholder={t('Select source')}
                                        />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {(
                                            [
                                                'krutidev',
                                                'spelling_variant',
                                                'rank_prefixed',
                                                'legacy',
                                                'manual',
                                            ] as const
                                        ).map((s) => (
                                            <SelectItem key={s} value={s}>
                                                {t(s)}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                <InputError message={form.errors.source} />
                            </div>
                            <div className="flex gap-3">
                                <Button
                                    type="submit"
                                    disabled={form.processing}
                                >
                                    {t('Save changes')}
                                </Button>
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => setOpen(false)}
                                >
                                    {t('Cancel')}
                                </Button>
                            </div>
                        </form>
                    </DialogContent>
                </Dialog>
            </div>

            <div className="divide-y">
                {(aliases ?? []).length === 0 ? (
                    <p className="py-4 text-sm text-muted-foreground">
                        {t('No aliases.')}
                    </p>
                ) : (
                    (aliases ?? []).map((a) => (
                        <div
                            key={a.id}
                            className="flex items-center justify-between py-3"
                        >
                            <div className="flex items-center gap-3">
                                <span className="text-sm font-medium">
                                    {a.alias}
                                </span>
                                <Badge variant="outline" className="text-xs">
                                    {t(a.source)}
                                </Badge>
                            </div>
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={() =>
                                    router.delete(
                                        destroyAlias.url({ member, alias: a }),
                                    )
                                }
                            >
                                <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}
