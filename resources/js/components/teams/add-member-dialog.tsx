import { useForm } from '@inertiajs/react';
import { useState } from 'react';
import { store as storeTeamMember } from '@/actions/App/Http/Controllers/TeamMemberController';
import InputError from '@/components/input-error';
import { MemberPicker } from '@/components/member-picker';
import type { MemberOption } from '@/components/member-picker';
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

const MEMBER_ROLES = ['PLAYER', 'CAPTAIN', 'RESERVE'] as const;

const CATEGORIES = [
    { value: 'GD', label: 'GD' },
    { value: 'SPORTS_QUOTA', label: 'Sports quota' },
] as const;

const LEVELS = [
    { value: 'ZONAL', label: 'Zonal' },
    { value: 'NATIONAL', label: 'National' },
    { value: 'INTERNATIONAL', label: 'International' },
    { value: 'AIPSC', label: 'AIPSC' },
] as const;

export function AddMemberDialog({ open, onOpenChange, team, sessions }: Props) {
    const { t } = useTranslation();
    const [pickedMember, setPickedMember] = useState<MemberOption | null>(null);
    const [filterCategory, setFilterCategory] = useState('');
    const [filterLevel, setFilterLevel] = useState('');

    const { data, setData, post, errors, processing, reset } = useForm<{
        member_ids: string[];
        session_id: string;
        role: string;
    }>({
        member_ids: [],
        session_id: team.session ? String(team.session.id) : '',
        role: 'PLAYER',
    });

    function handleMemberChange(m: MemberOption | null) {
        setPickedMember(m);
        setData('member_ids', m ? [String(m.id)] : []);
    }

    function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        post(storeTeamMember.url(team), {
            preserveScroll: true,
            onSuccess: () => {
                setPickedMember(null);
                setFilterCategory('');
                setFilterLevel('');
                reset();
                onOpenChange(false);
            },
        });
    }

    function handleOpenChange(v: boolean) {
        if (!v) {
            setPickedMember(null);
            setFilterCategory('');
            setFilterLevel('');
            reset();
        }

        onOpenChange(v);
    }

    const extraFilters: Record<string, string> = {};

    if (filterCategory) {
extraFilters.player_category = filterCategory;
}

    if (filterLevel) {
extraFilters.player_level = filterLevel;
}

    return (
        <Dialog open={open} onOpenChange={handleOpenChange}>
            <DialogContent className="sm:max-w-lg" aria-describedby={undefined}>
                <DialogHeader>
                    <DialogTitle>{t('Add member')}</DialogTitle>
                </DialogHeader>

                {/* Search filters */}
                <div className="flex flex-wrap gap-2">
                    <Select value={filterCategory || '_all'} onValueChange={(v) => setFilterCategory(v === '_all' ? '' : v)}>
                        <SelectTrigger className="h-7 w-auto gap-1 px-2 text-xs">
                            <SelectValue placeholder={t('Category')} />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="_all">{t('All categories')}</SelectItem>
                            {CATEGORIES.map((c) => (
                                <SelectItem key={c.value} value={c.value}>
                                    {t(c.label)}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>

                    <Select value={filterLevel || '_all'} onValueChange={(v) => setFilterLevel(v === '_all' ? '' : v)}>
                        <SelectTrigger className="h-7 w-auto gap-1 px-2 text-xs">
                            <SelectValue placeholder={t('Level')} />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="_all">{t('All levels')}</SelectItem>
                            {LEVELS.map((l) => (
                                <SelectItem key={l.value} value={l.value}>
                                    {t(l.label)}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid gap-2">
                        <Label htmlFor="dlg-add-member">{t('Athlete')}</Label>
                        <MemberPicker
                            id="dlg-add-member"
                            value={pickedMember}
                            onChange={handleMemberChange}
                            extraFilters={extraFilters}
                        />
                        <InputError message={errors.member_ids ?? (errors as Record<string, string>)['member_ids.0']} />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="grid gap-2">
                            <Label htmlFor="dlg-add-member-session">{t('Session')}</Label>
                            <Select value={data.session_id} onValueChange={(v) => setData('session_id', v)}>
                                <SelectTrigger id="dlg-add-member-session" className="w-full">
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
                            <Label htmlFor="dlg-add-member-role">{t('Role')}</Label>
                            <Select value={data.role} onValueChange={(v) => setData('role', v)}>
                                <SelectTrigger id="dlg-add-member-role" className="w-full">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {MEMBER_ROLES.map((r) => (
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
                        <Button type="submit" size="sm" disabled={processing || !pickedMember}>
                            {t('Add member')}
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
