import { useForm } from '@inertiajs/react';
import { UserCheck, UserPlus, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { store as storeTeamMember } from '@/actions/App/Http/Controllers/TeamMemberController';
import InputError from '@/components/input-error';
import { MemberPicker } from '@/components/member-picker';
import type { MemberOption } from '@/components/member-picker';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
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

type Session = { id: number; name: string };
type Team = {
    id: number;
    sport: { id: number; name: string } | null;
    session: Session | null;
};

interface Props {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    team: Team;
    sessions: Session[];
    selectedSessionId: number | null;
    onAdded?: (members: MemberOption[]) => void;
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

export function AddMemberDialog({
    open,
    onOpenChange,
    team,
    sessions,
    selectedSessionId,
    onAdded,
}: Props) {
    const { t } = useTranslation();
    const [pickedMember, setPickedMember] = useState<MemberOption | null>(null);
    const [selectedMembers, setSelectedMembers] = useState<MemberOption[]>([]);
    const [filterCategory, setFilterCategory] = useState('');
    const [filterLevel, setFilterLevel] = useState('');

    const { data, setData, post, errors, processing, reset } = useForm<{
        member_ids: string[];
        session_id: string;
        role: string;
        joined_on: string;
    }>({
        member_ids: [],
        session_id: selectedSessionId ? String(selectedSessionId) : '',
        role: 'PLAYER',
        joined_on: '',
    });

    useEffect(() => {
        setData('session_id', selectedSessionId ? String(selectedSessionId) : '');
    }, [selectedSessionId, setData]);

    function handleMemberChange(m: MemberOption | null) {
        setPickedMember(m);

        if (!m || selectedMembers.some((member) => member.id === m.id)) {
            return;
        }

        const next = [...selectedMembers, m];
        setSelectedMembers(next);
        setData(
            'member_ids',
            next.map((member) => String(member.id)),
        );
        setPickedMember(null);
    }

    function removeSelectedMember(memberId: number) {
        const next = selectedMembers.filter((member) => member.id !== memberId);
        setSelectedMembers(next);
        setData(
            'member_ids',
            next.map((member) => String(member.id)),
        );
    }

    function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        const submittedMembers = selectedMembers;
        post(storeTeamMember.url(team), {
            preserveScroll: true,
            onSuccess: () => {
                onAdded?.(submittedMembers);
                setPickedMember(null);
                setSelectedMembers([]);
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
            setSelectedMembers([]);
            setFilterCategory('');
            setFilterLevel('');
            reset();
        }

        onOpenChange(v);
    }

    const extraFilters: Record<string, string> = {};

    extraFilters.available_for_team_id = String(team.id);

    if (data.session_id) {
        extraFilters.available_for_session_id = data.session_id;
    }

    if (filterCategory) {
        extraFilters.player_category = filterCategory;
    }

    if (filterLevel) {
        extraFilters.player_level = filterLevel;
    }

    return (
        <Dialog open={open} onOpenChange={handleOpenChange}>
            <DialogContent className="sm:max-w-xl" aria-describedby={undefined}>
                <DialogHeader>
                    <div className="mb-1 inline-flex items-center rounded-full border border-sky-200 bg-sky-50 px-3 py-1 text-xs font-medium tracking-wide text-sky-700 dark:border-sky-900/50 dark:bg-sky-950 dark:text-sky-200">
                        <UserPlus className="mr-1.5 h-3.5 w-3.5" />
                        {t('Team roster')}
                    </div>
                    <DialogTitle className="text-lg">
                        {t('Add member')}
                    </DialogTitle>
                    <p className="text-sm text-muted-foreground">
                        {t('Add one or more active athletes for this session.')}
                    </p>
                </DialogHeader>

                {/* Search filters */}
                <div className="rounded-lg border border-sky-200/70 bg-sky-50/60 p-3 dark:border-sky-900/40 dark:bg-sky-950/40">
                    <p className="mb-2 text-xs font-medium tracking-wide text-sky-700 dark:text-sky-200">
                        {t('Filter available athletes')}
                    </p>
                    <div className="flex flex-wrap gap-2">
                        <Select
                            value={filterCategory || '_all'}
                            onValueChange={(v) =>
                                setFilterCategory(v === '_all' ? '' : v)
                            }
                        >
                            <SelectTrigger className="h-8 w-auto min-w-28 gap-2 px-2.5">
                                <SelectValue placeholder={t('Category')} />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="_all">
                                    {t('All categories')}
                                </SelectItem>
                                {CATEGORIES.map((c) => (
                                    <SelectItem key={c.value} value={c.value}>
                                        {t(c.label)}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>

                        <Select
                            value={filterLevel || '_all'}
                            onValueChange={(v) =>
                                setFilterLevel(v === '_all' ? '' : v)
                            }
                        >
                            <SelectTrigger className="h-8 w-auto min-w-28 gap-2 px-2.5">
                                <SelectValue placeholder={t('Level')} />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="_all">
                                    {t('All levels')}
                                </SelectItem>
                                {LEVELS.map((l) => (
                                    <SelectItem key={l.value} value={l.value}>
                                        {t(l.label)}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid gap-2">
                        <Label htmlFor="dlg-add-member">{t('Athlete')}</Label>
                        <MemberPicker
                            id="dlg-add-member"
                            value={pickedMember}
                            onChange={handleMemberChange}
                            placeholder={
                                team.sport
                                    ? t(
                                          'Search active :sport athletes…',
                                      ).replace(':sport', team.sport.name)
                                    : t('Search active athletes…')
                            }
                            extraFilters={extraFilters}
                        />
                        <InputError
                            message={
                                errors.member_ids ??
                                (errors as Record<string, string>)[
                                    'member_ids.0'
                                ]
                            }
                        />
                    </div>

                    {selectedMembers.length > 0 && (
                        <div className="grid gap-2 rounded-lg border border-sky-200/70 bg-sky-50/70 p-3 dark:border-sky-900/50 dark:bg-sky-950/30">
                            <div className="flex items-center justify-between gap-2">
                                <Label className="text-sky-900 dark:text-sky-200">
                                    {t('Selected athletes')}
                                </Label>
                                <span className="text-xs text-sky-700 dark:text-sky-200/80">
                                    {selectedMembers.length}{' '}
                                    {selectedMembers.length > 1
                                        ? t('athletes selected')
                                        : t('athlete selected')}
                                </span>
                            </div>
                            <div className="flex flex-wrap gap-2">
                                {selectedMembers.map((member) => (
                                    <span
                                        key={member.id}
                                        className="inline-flex items-center gap-1.5 rounded-full border border-sky-200 bg-white px-2.5 py-1 text-xs dark:border-sky-900 dark:bg-slate-900/80"
                                    >
                                        <UserCheck className="h-3.5 w-3.5 text-sky-600 dark:text-sky-300" />
                                        <span className="font-medium">
                                            {member.full_name}
                                        </span>
                                        {member.pno && (
                                            <span className="font-mono text-xs text-muted-foreground">
                                                {member.pno}
                                            </span>
                                        )}
                                        <button
                                            type="button"
                                            className="rounded-full p-0.5 text-muted-foreground hover:bg-sky-100 hover:text-sky-700 dark:hover:bg-slate-800"
                                            onClick={() =>
                                                removeSelectedMember(member.id)
                                            }
                                            aria-label={t('Remove')}
                                        >
                                            <X className="h-3 w-3" />
                                        </button>
                                    </span>
                                ))}
                            </div>
                        </div>
                    )}

                    <div className="grid grid-cols-2 gap-4">
                        <div className="grid gap-2">
                            <Label htmlFor="dlg-add-member-session">
                                {t('Session')}
                            </Label>
                            <Select
                                value={data.session_id}
                                onValueChange={(v) => setData('session_id', v)}
                            >
                                <SelectTrigger
                                    id="dlg-add-member-session"
                                    className="w-full"
                                >
                                    <SelectValue
                                        placeholder={t('Select session')}
                                    />
                                </SelectTrigger>
                                <SelectContent>
                                    {sessions.map((session) => (
                                        <SelectItem
                                            key={session.id}
                                            value={String(session.id)}
                                        >
                                            {session.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            <InputError message={errors.session_id} />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="dlg-add-member-role">
                                {t('Role')}
                            </Label>
                            <Select
                                value={data.role}
                                onValueChange={(v) => setData('role', v)}
                            >
                                <SelectTrigger
                                    id="dlg-add-member-role"
                                    className="w-full"
                                >
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
                        <div className="grid gap-2">
                            <Label htmlFor="dlg-add-member-joined">
                                {t('Joined on')}
                            </Label>
                            <Input
                                id="dlg-add-member-joined"
                                type="date"
                                value={data.joined_on}
                                onChange={(e) =>
                                    setData('joined_on', e.target.value)
                                }
                            />
                            <InputError message={errors.joined_on} />
                        </div>
                    </div>

                    <div className="flex gap-2">
                        <Button
                            type="submit"
                            size="sm"
                            disabled={
                                processing || selectedMembers.length === 0
                            }
                        >
                                {selectedMembers.length > 1
                                    ? t('Add selected (:count)').replace(
                                          ':count',
                                          String(selectedMembers.length),
                                      )
                                    : t('Add member')}
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
