import { useForm } from '@inertiajs/react';
import { useState } from 'react';
import { store as storeTeamCoach } from '@/actions/App/Http/Controllers/TeamCoachController';
import { CoachPicker } from '@/components/coach-picker';
import type { CoachOption } from '@/components/coach-picker';
import { DatePicker } from '@/components/date-picker';
import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { useTranslation } from '@/hooks/use-translation';

type Team = {
    id: number;
    sport: { id: number; name: string } | null;
};

interface Props {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    team: Team;
}

const COACH_ROLES = ['HEAD', 'ASSISTANT'] as const;

export function AddCoachDialog({ open, onOpenChange, team }: Props) {
    const { t } = useTranslation();
    const [pickedCoach, setPickedCoach] = useState<CoachOption | null>(null);
    const today = new Date();
    const maxAssignmentDate = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

    const { data, setData, post, errors, processing, reset } = useForm({
        coach_id: '',
        role: 'ASSISTANT',
        assigned_at: '',
    });

    function coachRoleLabel(role: string): string {
        return role === 'HEAD' ? t('Head Coach') : t('Assistant Coach');
    }

    function handleCoachChange(c: CoachOption | null) {
        setPickedCoach(c);
        setData('coach_id', c ? String(c.id) : '');
    }

    function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        post(storeTeamCoach.url(team), {
            preserveScroll: true,
            onSuccess: () => {
                setPickedCoach(null);
                reset();
                onOpenChange(false);
            },
        });
    }

    function handleOpenChange(v: boolean) {
        if (!v) {
            setPickedCoach(null);
            reset();
        }

        onOpenChange(v);
    }

    return (
        <Dialog open={open} onOpenChange={handleOpenChange}>
            <DialogContent className="sm:max-w-lg" aria-describedby={undefined}>
                <DialogHeader>
                    <DialogTitle>{t('Add coach')}</DialogTitle>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid gap-2">
                        <Label htmlFor="dlg-add-coach">{t('Coach')}</Label>
                        <CoachPicker
                            id="dlg-add-coach"
                            value={pickedCoach}
                            onChange={handleCoachChange}
                            sportId={team.sport?.id}
                        />
                        <InputError message={errors.coach_id} />
                    </div>

                    <div className="grid gap-4">
                        <div className="grid gap-2">
                            <Label htmlFor="dlg-add-coach-role">
                                {t('Role')}
                            </Label>
                            <Select
                                value={data.role}
                                onValueChange={(v) => setData('role', v)}
                            >
                                <SelectTrigger
                                    id="dlg-add-coach-role"
                                    className="w-full"
                                >
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {COACH_ROLES.map((r) => (
                                        <SelectItem key={r} value={r}>
                                            {coachRoleLabel(r)}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            <InputError message={errors.role} />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="dlg-add-coach-assigned-at">
                                {t('Assigned on')}
                            </Label>
                            <DatePicker
                                id="dlg-add-coach-assigned-at"
                                value={data.assigned_at}
                                onChange={(value) =>
                                    setData('assigned_at', value)
                                }
                                maxDate={maxAssignmentDate}
                            />
                            <InputError message={errors.assigned_at} />
                        </div>
                    </div>

                    <div className="flex gap-2">
                        <Button
                            type="submit"
                            size="sm"
                            disabled={
                                processing || !pickedCoach || !data.assigned_at
                            }
                        >
                            {t('Add coach')}
                        </Button>
                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => handleOpenChange(false)}
                        >
                            {t('Cancel')}
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
}
