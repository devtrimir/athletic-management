import { useForm } from '@inertiajs/react';
import TeamCloneController from '@/actions/App/Http/Controllers/TeamCloneController';
import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { useTranslation } from '@/hooks/use-translation';

type Session = { id: number; name: string };
type Team = { id: number; session: Session | null };

type MemberRow = {
    id: number;
    role: string | null;
    member: { id: number; full_name: string; pno: string | null } | null;
};

type CoachRow = {
    id: number;
    role: string | null;
    coach: { id: number; full_name: string; pno: string | null } | null;
};

interface Props {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    team: Team;
    sessions: Session[];
    members?: MemberRow[];
    coaches?: CoachRow[];
}

export function CloneTeamDialog({ open, onOpenChange, team, sessions, members, coaches }: Props) {
    const { t } = useTranslation();

    const otherSessions = sessions.filter((s) => s.id !== team.session?.id);

    const { data, setData, post, errors, processing, reset } = useForm<{
        session_id: string;
        member_ids: number[];
        coach_ids: number[];
    }>({
        session_id: '',
        member_ids: [],
        coach_ids: [],
    });

    function toggleMember(id: number, checked: boolean) {
        setData('member_ids', checked ? [...data.member_ids, id] : data.member_ids.filter((x) => x !== id));
    }

    function toggleCoach(id: number, checked: boolean) {
        setData('coach_ids', checked ? [...data.coach_ids, id] : data.coach_ids.filter((x) => x !== id));
    }

    function selectAllMembers() {
        setData('member_ids', (members ?? []).map((r) => r.id));
    }

    function selectAllCoaches() {
        setData('coach_ids', (coaches ?? []).map((r) => r.id));
    }

    function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        post(TeamCloneController.url(team), {
            onSuccess: () => {
                reset();
                onOpenChange(false);
            },
        });
    }

    function handleOpenChange(v: boolean) {
        if (!v) {
reset();
}

        onOpenChange(v);
    }

    const loaded = members !== undefined && coaches !== undefined;

    return (
        <Dialog open={open} onOpenChange={handleOpenChange}>
            <DialogContent className="sm:max-w-xl">
                <DialogHeader>
                    <DialogTitle>{t('Clone team to session')}</DialogTitle>
                    <DialogDescription>{t('Players or coaches already in another team for the chosen session will be skipped.')}</DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-5">
                    {/* Target session */}
                    <div className="grid gap-2">
                        <Label htmlFor="clone-session">{t('Target session')}</Label>
                        <Select value={data.session_id} onValueChange={(v) => setData('session_id', v)}>
                            <SelectTrigger id="clone-session" className="w-full">
                                <SelectValue placeholder={t('Select session')} />
                            </SelectTrigger>
                            <SelectContent>
                                {otherSessions.map((s) => (
                                    <SelectItem key={s.id} value={String(s.id)}>
                                        {s.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <InputError message={errors.session_id} />
                    </div>

                    {/* Players */}
                    <div className="grid gap-2">
                        <div className="flex items-center justify-between">
                            <span className="text-sm font-medium">{t('Players')}</span>
                            {loaded && (members ?? []).length > 0 && (
                                <div className="flex gap-2">
                                    <button type="button" className="text-xs text-primary underline-offset-2 hover:underline" onClick={selectAllMembers}>
                                        {t('Select all')}
                                    </button>
                                    <button
                                        type="button"
                                        className="text-xs text-muted-foreground underline-offset-2 hover:underline"
                                        onClick={() => setData('member_ids', [])}
                                    >
                                        {t('None')}
                                    </button>
                                </div>
                            )}
                        </div>

                        {!loaded ? (
                            <div className="space-y-2">
                                {[1, 2, 3].map((n) => (
                                    <Skeleton key={n} className="h-7 w-full" />
                                ))}
                            </div>
                        ) : (members ?? []).length === 0 ? (
                            <p className="text-sm text-muted-foreground">{t('No players in this team.')}</p>
                        ) : (
                            <div className="max-h-40 overflow-y-auto rounded border p-2 space-y-1">
                                {(members ?? []).map((row) => (
                                    <div key={row.id} className="flex items-center gap-2">
                                        <Checkbox
                                            id={`clone-m-${row.id}`}
                                            checked={data.member_ids.includes(row.id)}
                                            onCheckedChange={(v) => toggleMember(row.id, Boolean(v))}
                                        />
                                        <label htmlFor={`clone-m-${row.id}`} className="flex-1 cursor-pointer text-sm">
                                            {row.member?.full_name ?? '—'}
                                            {row.member?.pno && (
                                                <span className="ml-1.5 font-mono text-xs text-muted-foreground">{row.member.pno}</span>
                                            )}
                                            {row.role && (
                                                <span className="ml-1.5 text-xs text-muted-foreground">({t(row.role)})</span>
                                            )}
                                        </label>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Coaches */}
                    <div className="grid gap-2">
                        <div className="flex items-center justify-between">
                            <span className="text-sm font-medium">{t('Coaches')}</span>
                            {loaded && (coaches ?? []).length > 0 && (
                                <div className="flex gap-2">
                                    <button type="button" className="text-xs text-primary underline-offset-2 hover:underline" onClick={selectAllCoaches}>
                                        {t('Select all')}
                                    </button>
                                    <button
                                        type="button"
                                        className="text-xs text-muted-foreground underline-offset-2 hover:underline"
                                        onClick={() => setData('coach_ids', [])}
                                    >
                                        {t('None')}
                                    </button>
                                </div>
                            )}
                        </div>

                        {!loaded ? (
                            <div className="space-y-2">
                                {[1, 2].map((n) => (
                                    <Skeleton key={n} className="h-7 w-full" />
                                ))}
                            </div>
                        ) : (coaches ?? []).length === 0 ? (
                            <p className="text-sm text-muted-foreground">{t('No coaches in this team.')}</p>
                        ) : (
                            <div className="max-h-32 overflow-y-auto rounded border p-2 space-y-1">
                                {(coaches ?? []).map((row) => (
                                    <div key={row.id} className="flex items-center gap-2">
                                        <Checkbox
                                            id={`clone-c-${row.id}`}
                                            checked={data.coach_ids.includes(row.id)}
                                            onCheckedChange={(v) => toggleCoach(row.id, Boolean(v))}
                                        />
                                        <label htmlFor={`clone-c-${row.id}`} className="flex-1 cursor-pointer text-sm">
                                            {row.coach?.full_name ?? '—'}
                                            {row.coach?.pno && (
                                                <span className="ml-1.5 font-mono text-xs text-muted-foreground">{row.coach.pno}</span>
                                            )}
                                            {row.role && (
                                                <span className="ml-1.5 text-xs text-muted-foreground">({t(row.role)})</span>
                                            )}
                                        </label>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    <DialogFooter>
                        <Button type="button" variant="outline" size="sm" onClick={() => handleOpenChange(false)}>
                            {t('Cancel')}
                        </Button>
                        <Button type="submit" size="sm" disabled={processing || !data.session_id || !loaded}>
                            {t('Clone')}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
