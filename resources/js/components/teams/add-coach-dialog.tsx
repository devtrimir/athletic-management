import { useForm } from '@inertiajs/react';
import { useState } from 'react';
import { store as storeTeamCoach } from '@/actions/App/Http/Controllers/TeamCoachController';
import { CoachPicker } from '@/components/coach-picker';
import type { CoachOption } from '@/components/coach-picker';
import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useTranslation } from '@/hooks/use-translation';

type Session = { id: number; name: string };
type Team = { id: number; session: Session | null };

interface Props {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    team: Team;
    sessions: Session[];
}

const COACH_ROLES = ['HEAD', 'ASSISTANT'] as const;

export function AddCoachDialog({ open, onOpenChange, team, sessions }: Props) {
    const { t } = useTranslation();
    const [pickedCoach, setPickedCoach] = useState<CoachOption | null>(null);

    const { data, setData, post, errors, processing, reset } = useForm({
        coach_id: '',
        session_id: team.session ? String(team.session.id) : '',
        role: 'ASSISTANT',
    });

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
            <DialogContent className="sm:max-w-lg">
                <DialogHeader>
                    <DialogTitle>{t('Add coach')}</DialogTitle>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid gap-2">
                        <Label htmlFor="dlg-add-coach">{t('Coach')}</Label>
                        <CoachPicker id="dlg-add-coach" value={pickedCoach} onChange={handleCoachChange} />
                        <InputError message={errors.coach_id} />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="grid gap-2">
                            <Label htmlFor="dlg-add-coach-session">{t('Session')}</Label>
                            <Select value={data.session_id} onValueChange={(v) => setData('session_id', v)}>
                                <SelectTrigger id="dlg-add-coach-session" className="w-full">
                                    <SelectValue placeholder={t('Select session')} />
                                </SelectTrigger>
                                <SelectContent>
                                    {sessions.map((s) => (
                                        <SelectItem key={s.id} value={String(s.id)}>
                                            {s.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            <InputError message={errors.session_id} />
                        </div>

                        <div className="grid gap-2">
                            <Label htmlFor="dlg-add-coach-role">{t('Role')}</Label>
                            <Select value={data.role} onValueChange={(v) => setData('role', v)}>
                                <SelectTrigger id="dlg-add-coach-role" className="w-full">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {COACH_ROLES.map((r) => (
                                        <SelectItem key={r} value={r}>
                                            {t(r)}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            <InputError message={errors.role} />
                        </div>
                    </div>

                    <div className="flex gap-2">
                        <Button type="submit" size="sm" disabled={processing || !pickedCoach}>
                            {t('Add coach')}
                        </Button>
                        <Button type="button" variant="outline" size="sm" onClick={() => handleOpenChange(false)}>
                            {t('Cancel')}
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
}
