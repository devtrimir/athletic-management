import { useForm } from '@inertiajs/react';
import { Search, UserCheck, UserPlus, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import {
    available as availableTeamMembers,
    store as storeTeamMember,
} from '@/actions/App/Http/Controllers/TeamMemberController';
import InputError from '@/components/input-error';
import { MemberPicker } from '@/components/member-picker';
import type { MemberOption } from '@/components/member-picker';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
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
import { Skeleton } from '@/components/ui/skeleton';
import { useTranslation } from '@/hooks/use-translation';
import { playerCategoryLabel } from '@/lib/player-category';
import { cn } from '@/lib/utils';

type Session = { id: number; name: string };
type SportOption = { id: number; name: string; name_en?: string | null };
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
    sports?: SportOption[];
    selectedSessionId: number | null;
    onAdded?: (members: MemberOption[]) => void;
}

const MEMBER_ROLES = ['PLAYER', 'CAPTAIN', 'RESERVE'] as const;

const CATEGORIES = [
    { value: 'GD', label: 'GD' },
    { value: 'SPORTS_QUOTA', label: 'SPORTS_QUOTA' },
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
    sports,
    selectedSessionId,
    onAdded,
}: Props) {
    const { t } = useTranslation();
    const [pickedMember, setPickedMember] = useState<MemberOption | null>(null);
    const [selectedMembers, setSelectedMembers] = useState<MemberOption[]>([]);
    const [fetchedSports, setFetchedSports] = useState<SportOption[]>([]);
    const [filterSport, setFilterSport] = useState<string>(
        team.sport?.id ? String(team.sport.id) : '',
    );
    const [filterCategory, setFilterCategory] = useState('');
    const [filterLevel, setFilterLevel] = useState('');
    const [availableMembers, setAvailableMembers] = useState<MemberOption[]>(
        [],
    );
    const [loadingAvailable, setLoadingAvailable] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [showManualSearch, setShowManualSearch] = useState(false);

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
        setData(
            'session_id',
            selectedSessionId ? String(selectedSessionId) : '',
        );
    }, [selectedSessionId, setData]);

    useEffect(() => {
        if (open) {
            setFilterSport(team.sport?.id ? String(team.sport.id) : '');
        }
    }, [open, team.sport?.id]);

    useEffect(() => {
        if (sports && sports.length > 0) {
            return;
        }

        if (open && fetchedSports.length === 0) {
            fetch('/api/v1/sports', {
                headers: {
                    Accept: 'application/json',
                    'X-Requested-With': 'XMLHttpRequest',
                },
            })
                .then((res) => (res.ok ? res.json() : Promise.reject(res)))
                .then((json: { data: SportOption[] }) => {
                    if (json?.data) {
                        setFetchedSports(json.data);
                    }
                })
                .catch(() => {});
        }
    }, [open, sports, fetchedSports.length]);

    const allSports = sports && sports.length > 0 ? sports : fetchedSports;

    // Fetch inactive members for the selected sport/filters
    useEffect(() => {
        if (!open) {
            return;
        }

        const controller = new AbortController();
        setLoadingAvailable(true);

        const timer = setTimeout(
            () => {
                const queryParams: Record<string, string> = {};

                if (filterSport) {
                    queryParams.sport_id = filterSport;
                }

                if (data.session_id) {
                    queryParams.session_id = data.session_id;
                }

                if (filterCategory) {
                    queryParams.player_category = filterCategory;
                }

                if (filterLevel) {
                    queryParams.player_level = filterLevel;
                }

                if (searchQuery.trim()) {
                    queryParams.q = searchQuery.trim();
                }

                const url = availableTeamMembers.url(team, {
                    query: queryParams,
                });

                fetch(url, {
                    headers: {
                        Accept: 'application/json',
                        'X-Requested-With': 'XMLHttpRequest',
                    },
                    signal: controller.signal,
                })
                    .then((res) => (res.ok ? res.json() : Promise.reject(res)))
                    .then((json: { data: MemberOption[] }) => {
                        setAvailableMembers(json.data ?? []);
                        setLoadingAvailable(false);
                    })
                    .catch((err) => {
                        if (err.name !== 'AbortError') {
                            setLoadingAvailable(false);
                        }
                    });
            },
            searchQuery ? 250 : 0,
        );

        return () => {
            clearTimeout(timer);
            controller.abort();
        };
    }, [
        open,
        team,
        filterSport,
        filterCategory,
        filterLevel,
        data.session_id,
        searchQuery,
    ]);

    function toggleMemberSelection(member: MemberOption) {
        const isSelected = selectedMembers.some((m) => m.id === member.id);
        const next = isSelected
            ? selectedMembers.filter((m) => m.id !== member.id)
            : [...selectedMembers, member];

        setSelectedMembers(next);
        setData(
            'member_ids',
            next.map((m) => String(m.id)),
        );
    }

    function handleToggleSelectAll() {
        const unselectedVisible = availableMembers.filter(
            (m) => !selectedMembers.some((s) => s.id === m.id),
        );

        if (unselectedVisible.length > 0) {
            const next = [...selectedMembers, ...unselectedVisible];
            setSelectedMembers(next);
            setData(
                'member_ids',
                next.map((m) => String(m.id)),
            );
        } else {
            const visibleIds = new Set(availableMembers.map((m) => m.id));
            const next = selectedMembers.filter((m) => !visibleIds.has(m.id));
            setSelectedMembers(next);
            setData(
                'member_ids',
                next.map((m) => String(m.id)),
            );
        }
    }

    const allVisibleSelected =
        availableMembers.length > 0 &&
        availableMembers.every((m) =>
            selectedMembers.some((s) => s.id === m.id),
        );

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
                setSearchQuery('');
                setShowManualSearch(false);
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
            setSearchQuery('');
            setShowManualSearch(false);
            reset();
        }

        onOpenChange(v);
    }

    const extraFilters: Record<string, string> = {};
    extraFilters.available_for_team_id = String(team.id);

    if (filterSport) {
        extraFilters.sport_id = filterSport;
    }

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
            <DialogContent
                className="max-h-[92vh] overflow-y-auto sm:max-w-2xl"
                aria-describedby={undefined}
            >
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
                            value={filterSport || '_all'}
                            onValueChange={(v) =>
                                setFilterSport(v === '_all' ? '' : v)
                            }
                        >
                            <SelectTrigger className="h-8 w-auto min-w-32 gap-2 px-2.5">
                                <SelectValue placeholder={t('Sport')} />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="_all">
                                    {t('All sports')}
                                </SelectItem>
                                {allSports.map((s) => (
                                    <SelectItem key={s.id} value={String(s.id)}>
                                        {s.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>

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
                                        {playerCategoryLabel(c.label, t)}
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
                    {/* Available inactive athletes section */}
                    <div className="space-y-2">
                        <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2">
                                <Label className="text-sm font-semibold">
                                    {t('Available unassigned athletes')}
                                </Label>
                                <Badge
                                    variant="secondary"
                                    className="h-5 px-1.5 font-mono text-xs font-normal"
                                >
                                    {availableMembers.length}
                                </Badge>
                            </div>
                            {availableMembers.length > 0 && (
                                <button
                                    type="button"
                                    onClick={handleToggleSelectAll}
                                    className="text-xs font-medium text-sky-600 hover:text-sky-800 hover:underline dark:text-sky-400 dark:hover:text-sky-300"
                                >
                                    {allVisibleSelected
                                        ? t('Deselect all')
                                        : t('Select all')}
                                </button>
                            )}
                        </div>

                        {/* Quick search input within available members */}
                        <div className="relative">
                            <Search className="absolute top-2.5 left-2.5 h-4 w-4 text-muted-foreground" />
                            <Input
                                type="search"
                                placeholder={t('Search by name, PNO, or code…')}
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="h-9 pl-8 text-sm"
                            />
                        </div>

                        {/* List of unassigned athletes */}
                        <div className="max-h-52 divide-y divide-border/40 overflow-y-auto rounded-lg border border-border/70 bg-card p-1 shadow-2xs">
                            {loadingAvailable ? (
                                <div className="space-y-2 p-2">
                                    <Skeleton className="h-8 w-full" />
                                    <Skeleton className="h-8 w-full" />
                                    <Skeleton className="h-8 w-3/4" />
                                </div>
                            ) : availableMembers.length === 0 ? (
                                <div className="py-6 text-center text-sm text-muted-foreground">
                                    <p>
                                        {t(
                                            'No unassigned athletes found for this sport.',
                                        )}
                                    </p>
                                    <p className="mt-1 text-xs text-muted-foreground/80">
                                        {t(
                                            'Try changing filters or use the manual search below.',
                                        )}
                                    </p>
                                </div>
                            ) : (
                                availableMembers.map((member) => {
                                    const isSelected = selectedMembers.some(
                                        (m) => m.id === member.id,
                                    );

                                    return (
                                        <div
                                            key={member.id}
                                            onClick={() =>
                                                toggleMemberSelection(member)
                                            }
                                            className={cn(
                                                'flex cursor-pointer items-center justify-between gap-3 rounded-md p-2 transition-colors',
                                                isSelected
                                                    ? 'bg-sky-50/90 dark:bg-sky-950/60'
                                                    : 'hover:bg-accent/60',
                                            )}
                                        >
                                            <div className="flex min-w-0 flex-1 items-center gap-2.5">
                                                <Checkbox
                                                    checked={isSelected}
                                                    onCheckedChange={() =>
                                                        toggleMemberSelection(
                                                            member,
                                                        )
                                                    }
                                                    onClick={(e) =>
                                                        e.stopPropagation()
                                                    }
                                                />
                                                <div className="min-w-0 flex-1">
                                                    <div className="flex items-center gap-2">
                                                        <span className="truncate text-sm font-medium">
                                                            {member.full_name}
                                                        </span>
                                                        {member.pno && (
                                                            <span className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs text-muted-foreground">
                                                                {member.pno}
                                                            </span>
                                                        )}
                                                    </div>
                                                    <div className="mt-0.5 flex flex-wrap gap-1.5">
                                                        {member.player_category && (
                                                            <Badge
                                                                variant="secondary"
                                                                className="h-4 px-1.5 py-0 text-[10px]"
                                                            >
                                                                {playerCategoryLabel(
                                                                    member.player_category,
                                                                    t,
                                                                )}
                                                            </Badge>
                                                        )}
                                                        {member.player_level && (
                                                            <Badge
                                                                variant="outline"
                                                                className="h-4 px-1.5 py-0 text-[10px]"
                                                            >
                                                                {t(
                                                                    member.player_level,
                                                                )}
                                                            </Badge>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })
                            )}
                        </div>
                    </div>

                    {/* Manual search fallback toggle */}
                    <div className="pt-0.5">
                        <button
                            type="button"
                            onClick={() =>
                                setShowManualSearch(!showManualSearch)
                            }
                            className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground hover:underline"
                        >
                            {showManualSearch
                                ? t('Hide other athletes search')
                                : t(
                                      '+ Search other athletes outside this list',
                                  )}
                        </button>

                        {showManualSearch && (
                            <div className="mt-2 grid gap-2">
                                <MemberPicker
                                    id="dlg-add-member"
                                    value={pickedMember}
                                    onChange={handleMemberChange}
                                    placeholder={t(
                                        'Search athlete by name or PNO…',
                                    )}
                                    extraFilters={extraFilters}
                                />
                            </div>
                        )}
                    </div>

                    <InputError
                        message={
                            errors.member_ids ??
                            (errors as Record<string, string>)['member_ids.0']
                        }
                    />

                    {selectedMembers.length > 0 && (
                        <div className="grid gap-2 rounded-lg border border-sky-200/70 bg-sky-50/70 p-3 dark:border-sky-900/50 dark:bg-sky-950/30">
                            <div className="flex items-center justify-between gap-2">
                                <Label className="text-xs font-medium text-sky-900 dark:text-sky-200">
                                    {t('Selected athletes')}
                                </Label>
                                <div className="flex items-center gap-2">
                                    <span className="text-xs text-sky-700 dark:text-sky-200/80">
                                        {selectedMembers.length}{' '}
                                        {selectedMembers.length > 1
                                            ? t('athletes selected')
                                            : t('athlete selected')}
                                    </span>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setSelectedMembers([]);
                                            setData('member_ids', []);
                                        }}
                                        className="text-xs text-rose-600 hover:text-rose-800 hover:underline dark:text-rose-400"
                                    >
                                        {t('Clear all')}
                                    </button>
                                </div>
                            </div>
                            <div className="flex max-h-28 flex-wrap gap-2 overflow-y-auto">
                                {selectedMembers.map((member) => (
                                    <span
                                        key={member.id}
                                        className="inline-flex items-center gap-1.5 rounded-full border border-sky-200 bg-white px-2.5 py-1 text-xs shadow-2xs dark:border-sky-900 dark:bg-slate-900/80"
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

                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
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
