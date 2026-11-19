import { Form, Head } from '@inertiajs/react';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';
import CompetitionController from '@/actions/App/Http/Controllers/Settings/CompetitionController';
import GameLevelController from '@/actions/App/Http/Controllers/Settings/GameLevelController';
import Heading from '@/components/heading';
import InputError from '@/components/input-error';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useTranslation } from '@/hooks/use-translation';

type Competition = {
    id: number;
    game_level_id: number;
    name_en: string;
    name_hi: string;
    sort_order: number;
    is_active: boolean;
    tournaments_count: number;
};

type Level = {
    id: number;
    name_en: string;
    name_hi: string;
    sort_order: number;
    is_active: boolean;
    competitions: Competition[];
};

type Editing =
    | { kind: 'level'; level: Level | null }
    | { kind: 'competition'; levelId: number; competition: Competition | null }
    | null;

function ActiveField({ defaultChecked }: { defaultChecked: boolean }) {
    const { t } = useTranslation();

    return (
        <label className="flex items-center gap-2 text-sm">
            <input type="hidden" name="is_active" value="0" />
            <input
                type="checkbox"
                name="is_active"
                value="1"
                defaultChecked={defaultChecked}
                className="size-4 rounded border-input"
            />
            {t('Active')}
        </label>
    );
}

function EditorDialog({
    editing,
    onClose,
}: {
    editing: Editing;
    onClose: () => void;
}) {
    const { t } = useTranslation();

    if (editing === null) {
        return null;
    }

    const isLevel = editing.kind === 'level';
    const record = isLevel ? editing.level : editing.competition;
    const form = isLevel
        ? record
            ? GameLevelController.update.form(record.id)
            : GameLevelController.store.form()
        : record
          ? CompetitionController.update.form(record.id)
          : CompetitionController.store.form();
    const title = isLevel
        ? record
            ? t('Edit game level')
            : t('New game level')
        : record
          ? t('Edit competition')
          : t('New competition');

    return (
        <Dialog open onOpenChange={(open) => !open && onClose()}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>{title}</DialogTitle>
                    <DialogDescription>
                        {isLevel
                            ? t(
                                  'A game level groups competitions that earn the same points.',
                              )
                            : t(
                                  'A competition belongs to one game level; its level decides the points.',
                              )}
                    </DialogDescription>
                </DialogHeader>

                <Form {...form} onSuccess={onClose} className="space-y-4">
                    {({ processing, errors }) => (
                        <>
                            {!isLevel && (
                                <input
                                    type="hidden"
                                    name="game_level_id"
                                    value={editing.levelId}
                                />
                            )}
                            <div className="grid gap-4 sm:grid-cols-2">
                                <div className="grid gap-2">
                                    <Label htmlFor="name_en">
                                        {t('Name (English)')}
                                    </Label>
                                    <Input
                                        id="name_en"
                                        name="name_en"
                                        defaultValue={record?.name_en ?? ''}
                                        maxLength={255}
                                        required
                                    />
                                    <InputError message={errors.name_en} />
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="name_hi">
                                        {t('Name (Hindi)')}
                                    </Label>
                                    <Input
                                        id="name_hi"
                                        name="name_hi"
                                        defaultValue={record?.name_hi ?? ''}
                                        maxLength={255}
                                        required
                                    />
                                    <InputError message={errors.name_hi} />
                                </div>
                            </div>
                            <div className="grid max-w-[200px] gap-2">
                                <Label htmlFor="sort_order">{t('Order')}</Label>
                                <Input
                                    id="sort_order"
                                    name="sort_order"
                                    type="number"
                                    min={0}
                                    defaultValue={record?.sort_order ?? 0}
                                    className="tabular-nums"
                                    required
                                />
                                <InputError message={errors.sort_order} />
                            </div>
                            {record && (
                                <ActiveField
                                    defaultChecked={record.is_active}
                                />
                            )}
                            <DialogFooter>
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={onClose}
                                >
                                    {t('Cancel')}
                                </Button>
                                <Button disabled={processing}>
                                    {t('Save')}
                                </Button>
                            </DialogFooter>
                        </>
                    )}
                </Form>
            </DialogContent>
        </Dialog>
    );
}

function DeleteButton({ form, title }: { form: object; title: string }) {
    return (
        <Form
            {...form}
            onBefore={() => window.confirm(title)}
            className="inline"
        >
            {({ processing }) => (
                <Button
                    variant="ghost"
                    size="icon"
                    title={title}
                    disabled={processing}
                    className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                >
                    <Trash2 className="h-4 w-4" />
                </Button>
            )}
        </Form>
    );
}

export default function Index({ levels }: { levels: Level[] }) {
    const { t } = useTranslation();
    const [editing, setEditing] = useState<Editing>(null);

    return (
        <>
            <Head title={t('Game levels & competitions')} />

            <h1 className="sr-only">{t('Game levels & competitions')}</h1>

            <div className="space-y-4">
                <div className="flex items-start justify-between gap-4">
                    <Heading
                        variant="small"
                        title={t('Game levels & competitions')}
                        description={t(
                            'Group competitions into levels. Points for each level are set in the points versions.',
                        )}
                    />
                    <Button
                        size="sm"
                        onClick={() =>
                            setEditing({ kind: 'level', level: null })
                        }
                    >
                        <Plus className="mr-1.5 h-4 w-4" />
                        {t('New game level')}
                    </Button>
                </div>

                {levels.length === 0 && (
                    <div className="rounded-xl border py-12 text-center text-muted-foreground">
                        {t('No game levels yet.')}
                    </div>
                )}

                {levels.map((level) => (
                    <section
                        key={level.id}
                        className="overflow-hidden rounded-xl border"
                    >
                        <header className="flex items-center justify-between gap-3 bg-muted/50 px-4 py-3">
                            <div className="min-w-0">
                                <div className="flex items-center gap-2 font-medium">
                                    {level.name_en}
                                    {!level.is_active && (
                                        <Badge variant="secondary">
                                            {t('Inactive')}
                                        </Badge>
                                    )}
                                </div>
                                <div className="text-sm text-muted-foreground">
                                    {level.name_hi}
                                </div>
                            </div>
                            <div className="flex shrink-0 items-center gap-1">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() =>
                                        setEditing({
                                            kind: 'competition',
                                            levelId: level.id,
                                            competition: null,
                                        })
                                    }
                                >
                                    <Plus className="mr-1.5 h-4 w-4" />
                                    {t('Competition')}
                                </Button>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    title={t('Edit')}
                                    onClick={() =>
                                        setEditing({ kind: 'level', level })
                                    }
                                >
                                    <Pencil className="h-4 w-4" />
                                </Button>
                                <DeleteButton
                                    form={GameLevelController.destroy.form(
                                        level.id,
                                    )}
                                    title={t('Delete')}
                                />
                            </div>
                        </header>

                        <ul className="divide-y">
                            {level.competitions.length === 0 && (
                                <li className="px-4 py-4 text-sm text-muted-foreground">
                                    {t('No competitions in this level yet.')}
                                </li>
                            )}
                            {level.competitions.map((competition) => (
                                <li
                                    key={competition.id}
                                    className="flex items-center justify-between gap-3 px-4 py-2.5"
                                >
                                    <div className="min-w-0">
                                        <div className="flex items-center gap-2 text-sm">
                                            {competition.name_en}
                                            {!competition.is_active && (
                                                <Badge variant="secondary">
                                                    {t('Inactive')}
                                                </Badge>
                                            )}
                                        </div>
                                        <div className="text-xs text-muted-foreground">
                                            {competition.name_hi}
                                            {competition.tournaments_count >
                                                0 &&
                                                ` · ${t('Tournaments')}: ${competition.tournaments_count}`}
                                        </div>
                                    </div>
                                    <div className="flex shrink-0 items-center gap-1">
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            title={t('Edit')}
                                            onClick={() =>
                                                setEditing({
                                                    kind: 'competition',
                                                    levelId: level.id,
                                                    competition,
                                                })
                                            }
                                        >
                                            <Pencil className="h-4 w-4" />
                                        </Button>
                                        <DeleteButton
                                            form={CompetitionController.destroy.form(
                                                competition.id,
                                            )}
                                            title={t('Delete')}
                                        />
                                    </div>
                                </li>
                            ))}
                        </ul>
                    </section>
                ))}
            </div>

            <EditorDialog editing={editing} onClose={() => setEditing(null)} />
        </>
    );
}

Index.layout = {
    breadcrumbs: [
        {
            title: 'Game levels & competitions',
            href: GameLevelController.index.url(),
        },
    ],
};
