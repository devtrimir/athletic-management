import {
    Deferred,
    Head,
    Link,
    router,
    setLayoutProps,
    useForm,
    usePage,
} from '@inertiajs/react';
import {
    Download,
    AlertTriangle,
    ArchiveRestore,
    History,
    LayoutDashboard,
    Copy,
    CircleCheck,
    CircleX,
    Info,
    Pencil,
    Search,
    ShieldCheck,
    Printer,
    Trash2,
    UserPlus,
    Users,
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import CoachController from '@/actions/App/Http/Controllers/CoachController';
import MemberController from '@/actions/App/Http/Controllers/MemberController';
import {
    destroy as destroyTeamCoach,
    bulkDestroy as bulkDestroyCoaches,
    store as storeTeamCoach,
} from '@/actions/App/Http/Controllers/TeamCoachController';
import {
    edit as editTeam,
    index as teamsIndex,
    show as showTeam,
} from '@/actions/App/Http/Controllers/TeamController';
import { index as exportTeamUrl } from '@/actions/App/Http/Controllers/TeamExportController';
import {
    destroy as destroyTeamMember,
    bulkDestroy as bulkDestroyMembers,
    store as storeTeamMember,
    update as updateTeamMember,
} from '@/actions/App/Http/Controllers/TeamMemberController';
import {
    activate as activateTeamSessionStatus,
    close as closeTeamSessionStatus,
} from '@/actions/App/Http/Controllers/TeamSessionStatusController';
import InputError from '@/components/input-error';
import type { MemberOption } from '@/components/member-picker';
import { MemberQuickView } from '@/components/members/member-quick-view';
import { ChangeLog } from '@/components/shared/change-log';
import type { AuditEntry } from '@/components/shared/change-log';
import { AddCoachDialog } from '@/components/teams/add-coach-dialog';
import { AddMemberDialog } from '@/components/teams/add-member-dialog';
import { BackfillMembersDialog } from '@/components/teams/backfill-members-dialog';
import { CloneTeamDialog } from '@/components/teams/clone-team-dialog';
import { CoachQuickView } from '@/components/teams/coach-quick-view';
import { TeamInchargePanel } from '@/components/teams/team-incharge-panel';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { DatePicker } from '@/components/date-picker';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
    Dialog,
    DialogContent,
    DialogFooter,
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
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { useTranslation } from '@/hooks/use-translation';
import {
    changelog as teamChangelogRoute,
    coaches as teamCoachesRoute,
    incharge as teamInchargeRoute,
    players as teamPlayersRoute,
    show as teamOverviewRoute,
} from '@/routes/teams';

type Team = {
    id: number;
    name: string;
    in_charge: string | null;
    current_incharge_name: string | null;
    current_incharge_pno: string | null;
    current_incharge_designation: string | null;
    current_incharge_mobile: string | null;
    current_incharge_since: string | null;
    has_current_incharge: boolean;
    location_type: 'unit' | 'district';
    location_label: string | null;
    is_active: boolean;
    sport: { id: number; name: string } | null;
    session: { id: number; name: string } | null;
    district: { id: number; name: string } | null;
    unit: { id: number; name: string } | null;
    current_incharge_assignment: {
        id: number;
        incharge_id: number | null;
        full_name: string;
        pno: string | null;
        rank: string | null;
        designation: string | null;
        mobile: string | null;
        email: string | null;
        assigned_at: string | null;
        assignment_reason: string | null;
        remarks: string | null;
    } | null;
};

type TeamMemberRow = {
    id: number;
    role: string | null;
    joined_on: string | null;
    left_on: string | null;
    member: {
        id: number;
        full_name: string;
        full_name_normalized: string | null;
        member_code: string;
        pno: string | null;
        player_category: string | null;
        rank: string | null;
        designation: string | null;
        mobile: string | null;
        playable_profile: {
            sport_event: string | null;
            role: string | null;
            position: string | null;
        } | null;
        current_unit: {
            id: number;
            name: string;
        } | null;
    } | null;
    session: { id: number; name: string } | null;
};

type CoachAssignmentRow = {
    id: number;
    role: string | null;
    assigned_at: string | null;
    removed_at: string | null;
    notes: string | null;
    coach: {
        id: number;
        full_name: string;
        display_name: string | null;
        pno: string | null;
        sport_profile: {
            sport_event: string | null;
            level: string | null;
        } | null;
    } | null;
    session: { id: number; name: string } | null;
};

type Counts = { players_count: number; coaches_count: number };
type Session = { id: number; name: string; is_current: boolean; start_year?: number };
type TeamMemberMovementRow = {
    id: number;
    action: string;
    role: string | null;
    effective_on: string | null;
    reason: string | null;
    source: string;
    batch_uuid: string | null;
    created_at: string | null;
    member: {
        id: number;
        full_name: string;
        member_code: string;
        pno: string | null;
    } | null;
    created_by: { id: number; name: string } | null;
};
type InchargeHistoryRow = {
    id: number;
    full_name: string;
    pno: string | null;
    rank: string | null;
    designation: string | null;
    mobile: string | null;
    email: string | null;
    assigned_at: string | null;
    removed_at: string | null;
    assignment_reason: string | null;
    removal_reason: string | null;
    remarks: string | null;
    is_current: boolean;
    assigned_by: { id: number; name: string } | null;
    removed_by: { id: number; name: string } | null;
};
type InchargeOption = {
    id: number;
    full_name: string;
    pno: string;
    rank: string | null;
    designation: string | null;
    mobile: string | null;
    email: string | null;
};

type TeamSessionStatus = {
    status: 'active' | 'carried_forward' | 'inactive';
    label: string;
};

const MEMBER_ROLES = ['PLAYER', 'CAPTAIN', 'RESERVE'] as const;
const COACH_ROLES = ['HEAD', 'ASSISTANT'] as const;
type TeamProfileTab =
    | 'overview'
    | 'players'
    | 'coaches'
    | 'incharge'
    | 'changelog';

export default function TeamsShow({
    team,
    activeTab,
    counts,
    sessionStatus,
    sessions,
    selectedSessionId,
    members,
    removedMembers,
    removedCoaches,
    memberMovements,
    coaches,
    inchargeHistory,
    auditLog,
    incharges,
}: {
    team: Team;
    activeTab: TeamProfileTab;
    counts?: Counts;
    sessionStatus: TeamSessionStatus;
    sessions: Session[];
    selectedSessionId: number | null;
    members?: TeamMemberRow[];
    removedMembers?: TeamMemberRow[];
    removedCoaches?: CoachAssignmentRow[];
    memberMovements?: TeamMemberMovementRow[];
    coaches?: CoachAssignmentRow[];
    inchargeHistory?: InchargeHistoryRow[];
    auditLog?: AuditEntry[];
    incharges: InchargeOption[];
}) {
    const { t } = useTranslation();
    const page = usePage<{
        errors?: {
            assignIncharge?: Record<string, string>;
            changeIncharge?: Record<string, string>;
            removeIncharge?: Record<string, string>;
        } & Record<string, unknown>;
    }>();

    const [addMemberOpen, setAddMemberOpen] = useState(false);
    const [backfillOpen, setBackfillOpen] = useState(false);
    const [addCoachOpen, setAddCoachOpen] = useState(false);
    const [cloneOpen, setCloneOpen] = useState(false);
    const [closeSessionOpen, setCloseSessionOpen] = useState(false);
    const [memberQuickViewId, setMemberQuickViewId] = useState<number | null>(
        null,
    );
    const [coachQuickViewId, setCoachQuickViewId] = useState<number | null>(
        null,
    );
    const [editingMember, setEditingMember] = useState<TeamMemberRow | null>(
        null,
    );
    const [editMemberData, setEditMemberData] = useState({
        role: 'PLAYER',
        joined_on: '',
        left_on: '',
    });
    const hasAutoPrintRun = useRef(false);

    const [highlightedMemberIds, setHighlightedMemberIds] = useState<
        Set<number>
    >(new Set());
    const tabContentClass =
        'data-[state=active]:animate-in data-[state=active]:fade-in-0 data-[state=active]:slide-in-from-bottom-2 data-[state=active]:duration-300';
    const isSessionActive = sessionStatus.status === 'active';
    const sessionStatusLabel = sessionStatus.label;

    const tabQuery = useMemo(
        () =>
            selectedSessionId
                ? { query: { filter: { session_id: selectedSessionId } } }
                : undefined,
        [selectedSessionId],
    );

    const tabUrl = useCallback(
        (tab: TeamProfileTab): string => {
            if (tab === 'players') {
                return teamPlayersRoute.url(team, tabQuery);
            }

            if (tab === 'coaches') {
                return teamCoachesRoute.url(team, tabQuery);
            }

            if (tab === 'incharge') {
                return teamInchargeRoute.url(team, tabQuery);
            }

            if (tab === 'changelog') {
                return teamChangelogRoute.url(team, tabQuery);
            }

            return teamOverviewRoute.url(team, tabQuery);
        },
        [tabQuery, team],
    );

    const visitTab = useCallback(
        (tab: TeamProfileTab) => {
            router.visit(tabUrl(tab), {
                preserveScroll: true,
                preserveState: true,
            });
        },
        [tabUrl],
    );

    useEffect(() => {
        const errors = page.props.errors;

        if (
            (errors?.assignIncharge &&
                Object.keys(errors.assignIncharge).length > 0) ||
            (errors?.changeIncharge &&
                Object.keys(errors.changeIncharge).length > 0) ||
            (errors?.removeIncharge &&
                Object.keys(errors.removeIncharge).length > 0)
        ) {
            if (activeTab !== 'incharge') {
                visitTab('incharge');
            }
        }
    }, [activeTab, page.props.errors, visitTab]);

    // Selection state for bulk remove
    const [selectedMemberIds, setSelectedMemberIds] = useState<Set<number>>(
        new Set(),
    );
    const [selectedCoachIds, setSelectedCoachIds] = useState<Set<number>>(
        new Set(),
    );

    // Filter state for Players tab
    const [memberSessionFilter, setMemberSessionFilter] = useState('');
    const [memberRoleFilter, setMemberRoleFilter] = useState('');
    const [memberSearch, setMemberSearch] = useState('');

    // Filter state for Coaches tab
    const [coachSessionFilter, setCoachSessionFilter] = useState('');
    const [coachRoleFilter, setCoachRoleFilter] = useState('');
    const [coachSearch, setCoachSearch] = useState('');

    // Confirm dialog state
    type ConfirmState = {
        open: boolean;
        title: string;
        description: string;
        confirmLabel: string;
        names: string[];
        note: string;
        onConfirm: () => void;
    };
    const [confirm, setConfirm] = useState<ConfirmState>({
        open: false,
        title: '',
        description: '',
        confirmLabel: t('Confirm'),
        names: [],
        note: '',
        onConfirm: () => {},
    });
    const pendingConfirm = useRef<(() => void) | null>(null);
    const [removeMembersDialog, setRemoveMembersDialog] = useState<{
        open: boolean;
        memberIds: number[];
        names: string[];
        rows: TeamMemberRow[];
        left_on: string;
        reason: string;
    }>({
        open: false,
        memberIds: [],
        names: [],
        rows: [],
        left_on: new Date().toISOString().slice(0, 10),
        reason: '',
    });
    const [reactivateSessionDialog, setReactivateSessionDialog] = useState<{
        open: boolean;
        memberIds: number[];
        coachIds: number[];
        mode: 'fresh' | 'restore';
    }>({
        open: false,
        memberIds: [],
        coachIds: [],
        mode: 'fresh',
    });
    const [reactivateMemberSearch, setReactivateMemberSearch] = useState('');
    const [reactivateCoachSearch, setReactivateCoachSearch] = useState('');
    const closeSessionForm = useForm({
        session_id: selectedSessionId ? String(selectedSessionId) : '',
        closed_on: new Date().toISOString().slice(0, 10),
        reason: '',
        remove_coaches: false,
        preserve_members: false,
    });

    useEffect(() => {
        const shouldAutoPrint = new URLSearchParams(window.location.search).get(
            'print',
        );

        if (shouldAutoPrint !== '1' || hasAutoPrintRun.current) {
            return;
        }

        hasAutoPrintRun.current = true;

        const timeoutId = window.setTimeout(() => {
            handlePrint();

            const params = new URLSearchParams(window.location.search);
            params.delete('print');
            params.delete('print_sections');
            const nextQuery = params.toString();
            const nextUrl = `${window.location.pathname}${
                nextQuery ? `?${nextQuery}` : ''
            }${window.location.hash}`;
            window.history.replaceState(null, '', nextUrl);
        }, 120);

        return () => {
            window.clearTimeout(timeoutId);
        };
    }, [handlePrint]);

    function openConfirm(
        title: string,
        description: string,
        onConfirm: () => void,
        options: {
            confirmLabel?: string;
            names?: string[];
            note?: string;
        } = {},
    ) {
        pendingConfirm.current = onConfirm;
        setConfirm({
            open: true,
            title,
            description,
            confirmLabel: options.confirmLabel ?? t('Confirm'),
            names: options.names ?? [],
            note: options.note ?? '',
            onConfirm,
        });
    }

    setLayoutProps({
        breadcrumbs: [
            { title: t('Teams'), href: teamsIndex.url() },
            { title: team.name },
        ],
    });

    // Keyboard shortcuts — only when not inside an input/textarea
    useEffect(() => {
        function onKeyDown(e: KeyboardEvent) {
            if (
                e.target instanceof HTMLInputElement ||
                e.target instanceof HTMLTextAreaElement
            ) {
                return;
            }

            const mod = e.metaKey || e.ctrlKey;

            if (mod && e.shiftKey && e.key.toLowerCase() === 'm') {
                e.preventDefault();
                setAddMemberOpen(true);
            } else if (mod && e.shiftKey && e.key.toLowerCase() === 'h') {
                e.preventDefault();
                setAddCoachOpen(true);
            } else if (mod && e.shiftKey && e.key.toLowerCase() === 'd') {
                e.preventDefault();
                setCloneOpen(true);
            }
        }
        window.addEventListener('keydown', onKeyDown);

        return () => window.removeEventListener('keydown', onKeyDown);
    }, []);

    function highlightMembers(memberIds: number[]) {
        setHighlightedMemberIds(new Set(memberIds));

        window.setTimeout(() => {
            setHighlightedMemberIds(new Set());
        }, 6500);
    }

    function handleMembersAdded(addedMembers: MemberOption[]) {
        const count = addedMembers.length;

        visitTab('players');
        setSelectedMemberIds(new Set());
        highlightMembers(addedMembers.map((member) => member.id));

        window.setTimeout(() => {
            document
                .getElementById(`team-member-${addedMembers[0]?.id}`)
                ?.scrollIntoView({
                    behavior: 'smooth',
                    block: 'center',
                });
        }, 250);

        toast.success(
            count > 1
                ? t(':count members added to team.').replace(
                      ':count',
                      String(count),
                  )
                : t(':name added to team.').replace(
                      ':name',
                      addedMembers[0]?.full_name ?? t('Member'),
                  ),
        );
    }

    function restoreMembers(rows: TeamMemberRow[]) {
        const restoredIds = rows.flatMap((row) =>
            row.member ? [row.member.id] : [],
        );
        let restoreToastShown = false;

        rows.forEach((row) => {
            if (!row.member) {
                return;
            }

            router.post(
                storeTeamMember.url(team),
                {
                    member_ids: [String(row.member.id)],
                    session_id: selectedSessionId
                        ? String(selectedSessionId)
                        : String(row.session?.id ?? ''),
                    role: row.role ?? 'PLAYER',
                    joined_on: row.joined_on ?? '',
                    left_on: row.left_on ?? '',
                },
                {
                    preserveScroll: true,
                    onSuccess: () => {
                        visitTab('players');
                        highlightMembers(restoredIds);

                        if (!restoreToastShown) {
                            restoreToastShown = true;
                            toast.success(t('Members restored to team.'));
                        }
                    },
                },
            );
        });
    }

    function showUndoToast(rows: TeamMemberRow[]) {
        const count = rows.length;

        toast.success(
            count > 1
                ? t(':count members removed from team.').replace(
                      ':count',
                      String(count),
                  )
                : t(':name removed from team.').replace(
                      ':name',
                      rows[0]?.member?.full_name ?? t('Member'),
                  ),
            {
                action: {
                    label: t('Undo'),
                    onClick: () => restoreMembers(rows),
                },
            },
        );
    }

    function openRemoveMembersDialog(rows: TeamMemberRow[]) {
        setRemoveMembersDialog({
            open: true,
            memberIds: rows.flatMap((row) =>
                row.member ? [row.member.id] : [],
            ),
            names: rows.flatMap((row) =>
                row.member ? [row.member.full_name] : [],
            ),
            rows,
            left_on: new Date().toISOString().slice(0, 10),
            reason: '',
        });
    }

    function closeRemoveMembersDialog() {
        setRemoveMembersDialog((state) => ({
            ...state,
            open: false,
            memberIds: [],
            names: [],
            rows: [],
            reason: '',
        }));
    }

    function openCloseSessionDialog() {
        closeSessionForm.setData({
            session_id: selectedSessionId ? String(selectedSessionId) : '',
            closed_on: new Date().toISOString().slice(0, 10),
            reason: '',
            remove_coaches: false,
            preserve_members: false,
        });
        closeSessionForm.clearErrors();
        setCloseSessionOpen(true);
    }

    function submitCloseSession(event: React.FormEvent) {
        event.preventDefault();

        closeSessionForm.patch(closeTeamSessionStatus.url(team), {
            preserveScroll: true,
            onSuccess: () => {
                closeSessionForm.reset();
                setCloseSessionOpen(false);

                if (selectedSessionId) {
                    router.get(
                        teamsIndex.url(),
                        {
                            'filter[session_id]': String(selectedSessionId),
                            'filter[is_active]': '0',
                        },
                        {
                            replace: true,
                        },
                    );
                }
            },
        });
    }

    function buildExportUrl(): string {
        const params = new URLSearchParams();

        params.append('ids[]', String(team.id));

        if (selectedSessionId) {
            params.append('filter[session_id]', String(selectedSessionId));
        }

        return `${exportTeamUrl.url()}?${params.toString()}`;
    }

    function handlePrint() {
        const rawPrintSections = new URLSearchParams(
            window.location.search,
        ).get('print_sections');
        const printSections = rawPrintSections
            ? rawPrintSections
                  .split(',')
                  .map((value) =>
                      value
                          .trim()
                          .toLowerCase()
                          .replace(/\s+/g, '_'),
                  )
                  .filter(Boolean)
            : [];

        const printSectionsParam =
            printSections.length === 0 || printSections.includes('all')
                ? 'all'
                : printSections.join(',');

        const query = {
            filter: selectedSessionId
                ? {
                      session_id: String(selectedSessionId),
                  }
                : undefined,
            print: '1',
            print_sections: printSectionsParam,
            page_mode: 'landscape',
        } as {
            filter?: { session_id: string };
            print: string;
            print_sections: string;
            page_mode: 'portrait' | 'landscape';
        };

        const printUrl = teamPlayersRoute.url(team, { query });
        const printWindow = window.open(
            printUrl,
            '_blank',
            'noopener,noreferrer',
        );

        if (printWindow) {
            return;
        }

        toast.info(t('Popup blocked. Opening print view in current tab.'));
        window.location.href = printUrl;
    }

    function submitRemoveMembers() {
        if (
            removeMembersDialog.memberIds.length === 0 ||
            !removeMembersDialog.left_on ||
            !removeMembersDialog.reason.trim()
        ) {
            return;
        }

        const payload = {
            session_id: selectedSessionId,
            left_on: removeMembersDialog.left_on,
            reason: removeMembersDialog.reason,
        };

        if (removeMembersDialog.memberIds.length === 1) {
            const memberId = removeMembersDialog.memberIds[0];

            router.delete(destroyTeamMember.url([team, memberId]), {
                data: payload,
                preserveScroll: true,
                onSuccess: () => {
                    setSelectedMemberIds((prev) => {
                        const next = new Set(prev);
                        next.delete(memberId);

                        return next;
                    });
                    showUndoToast(removeMembersDialog.rows);
                    closeRemoveMembersDialog();
                },
            });

            return;
        }

        router.delete(bulkDestroyMembers.url(team), {
            data: {
                ...payload,
                member_ids: removeMembersDialog.memberIds,
            },
            preserveScroll: true,
            onSuccess: () => {
                setSelectedMemberIds(new Set());
                showUndoToast(removeMembersDialog.rows);
                closeRemoveMembersDialog();
            },
        });
    }

    function removeMember(memberId: number, memberName?: string) {
        const row = (members ?? []).find(
            (item) => item.member?.id === memberId,
        );

        if (row) {
            openRemoveMembersDialog([row]);
        } else if (memberName) {
            toast.error(
                t('Unable to prepare removal for :name.').replace(
                    ':name',
                    memberName,
                ),
            );
        }
    }

    function submitActivateSession() {
        if (!selectedSessionId) {
            return;
        }

        setReactivateMemberSearch('');
        setReactivateCoachSearch('');
        setReactivateSessionDialog({
            open: true,
            memberIds: [],
            coachIds: [],
            mode: 'fresh',
        });
    }

    function closeReactivateSessionDialog() {
        setReactivateMemberSearch('');
        setReactivateCoachSearch('');
        setReactivateSessionDialog({
            open: false,
            memberIds: [],
            coachIds: [],
            mode: 'fresh',
        });
    }

    function submitActivateSessionWithSelections() {
        if (!selectedSessionId) {
            return;
        }

        const selectedRemovedMembers = (removedMembers ?? []).filter((row) => {
            return row.member ? reactivateSessionDialog.memberIds.includes(row.member.id) : false;
        });
        const selectedRemovedCoaches = (removedCoaches ?? []).filter((row) => {
            return row.coach ? reactivateSessionDialog.coachIds.includes(row.coach.id) : false;
        });
        const shouldRestore = reactivateSessionDialog.mode === 'restore';
        const pendingTasks = shouldRestore
            ? selectedRemovedMembers.length + selectedRemovedCoaches.length
            : 0;

        const finalizeActivation = () => {
            router.patch(activateTeamSessionStatus.url(team), {
                session_id: String(selectedSessionId),
            }, {
                preserveScroll: true,
                onSuccess: () => {
                    setSelectedMemberIds(new Set());
                    setSelectedCoachIds(new Set());
                    closeReactivateSessionDialog();
                },
            });
        };

        if (!shouldRestore || pendingTasks === 0) {
            finalizeActivation();

            return;
        }

        let remainingTasks = pendingTasks;
        const done = () => {
            remainingTasks -= 1;
            if (remainingTasks <= 0) {
                finalizeActivation();
            }
        };

        selectedRemovedMembers.forEach((row) => {
            if (!row.member) {
                done();

                return;
            }

            router.post(
                storeTeamMember.url(team),
                {
                    member_ids: [String(row.member.id)],
                    session_id: String(selectedSessionId),
                    role: row.role ?? 'PLAYER',
                    joined_on: row.joined_on ?? '',
                },
                {
                    preserveScroll: true,
                    onSuccess: () => {
                        done();
                    },
                    onError: () => {
                        done();
                    },
                },
            );
        });

        selectedRemovedCoaches.forEach((row) => {
            if (!row.coach) {
                done();

                return;
            }

            router.post(
                storeTeamCoach.url(team),
                {
                    coach_id: String(row.coach.id),
                    role: row.role === 'ASSISTANT' ? 'ASSISTANT' : 'HEAD',
                    assigned_at:
                        row.assigned_at ?? new Date().toISOString().slice(0, 10),
                },
                {
                    preserveScroll: true,
                    onSuccess: () => {
                        done();
                    },
                    onError: () => {
                        done();
                    },
                },
            );
        });
    }

    function toggleRestoreMember(memberId: number) {
        if (reactivateSessionDialog.mode !== 'restore') {
            return;
        }

        setReactivateSessionDialog((state) => {
            const next = new Set(state.memberIds);
            if (next.has(memberId)) {
                next.delete(memberId);
            } else {
                next.add(memberId);
            }

            return {
                ...state,
                memberIds: Array.from(next),
            };
        });
    }

    function toggleRestoreCoach(coachId: number) {
        if (reactivateSessionDialog.mode !== 'restore') {
            return;
        }

        setReactivateSessionDialog((state) => {
            const next = new Set(state.coachIds);
            if (next.has(coachId)) {
                next.delete(coachId);
            } else {
                next.add(coachId);
            }

            return {
                ...state,
                coachIds: Array.from(next),
            };
        });
    }

    function selectAllReactivateMembers() {
        setReactivateSessionDialog((state) => ({
            ...state,
            memberIds: reactivateMembersToShow
                .map((row) => row.member?.id)
                .filter((id): id is number => id !== undefined),
        }));
    }

    function deselectAllReactivateMembers() {
        setReactivateSessionDialog((state) => ({
            ...state,
            memberIds: [],
        }));
    }

    function selectAllReactivateCoaches() {
        setReactivateSessionDialog((state) => ({
            ...state,
            coachIds: reactivateCoachesToShow
                .map((row) => row.coach?.id)
                .filter((id): id is number => id !== undefined),
        }));
    }

    function deselectAllReactivateCoaches() {
        setReactivateSessionDialog((state) => ({
            ...state,
            coachIds: [],
        }));
    }

    function removeCoach(coachId: number, coachName?: string) {
        openConfirm(
            t('Remove coach'),
            coachName
                ? t('Remove :name from the team?').replace(':name', coachName)
                : t('Remove this coach from the team?'),
            () =>
                router.delete(destroyTeamCoach.url([team, coachId]), {
                    preserveScroll: true,
                    onSuccess: () =>
                        toast.success(t('Coach removed from team.')),
                }),
            {
                confirmLabel: t('Remove coach'),
                names: coachName ? [coachName] : [],
            },
        );
    }

    function toggleMember(id: number) {
        setSelectedMemberIds((prev) => {
            const next = new Set(prev);

            if (next.has(id)) {
                next.delete(id);
            } else {
                next.add(id);
            }

            return next;
        });
    }

    function toggleAllMembers(visibleIds: number[]) {
        const allSelected = visibleIds.every((id) => selectedMemberIds.has(id));
        setSelectedMemberIds(allSelected ? new Set() : new Set(visibleIds));
    }

    function handleBulkRemoveMembers() {
        const removedRows = (members ?? []).filter(
            (row) => row.member && selectedMemberIds.has(row.member.id),
        );

        openRemoveMembersDialog(removedRows);
    }

    function openMemberEdit(row: TeamMemberRow) {
        setEditingMember(row);
        setEditMemberData({
            role: row.role ?? 'PLAYER',
            joined_on: row.joined_on ?? '',
            left_on: row.left_on ?? '',
        });
    }

    function submitMemberEdit(e: React.FormEvent) {
        e.preventDefault();

        if (!editingMember) {
            return;
        }

        router.patch(
            updateTeamMember.url([team, editingMember]),
            editMemberData,
            {
                preserveScroll: true,
                onSuccess: () => setEditingMember(null),
            },
        );
    }

    function toggleCoach(id: number) {
        setSelectedCoachIds((prev) => {
            const next = new Set(prev);

            if (next.has(id)) {
                next.delete(id);
            } else {
                next.add(id);
            }

            return next;
        });
    }

    function toggleAllCoaches(visibleIds: number[]) {
        const allSelected = visibleIds.every((id) => selectedCoachIds.has(id));
        setSelectedCoachIds(allSelected ? new Set() : new Set(visibleIds));
    }

    function handleBulkRemoveCoaches() {
        const count = selectedCoachIds.size;
        const ids = Array.from(selectedCoachIds);
        openConfirm(
            t('Remove selected (:count)').replace(':count', String(count)),
            t('Remove :count selected coaches?').replace(
                ':count',
                String(count),
            ),
            () =>
                router.delete(bulkDestroyCoaches.url(team), {
                    data: { coach_ids: ids },
                    preserveScroll: true,
                    onSuccess: () => {
                        setSelectedCoachIds(new Set());
                        toast.success(
                            t(':count coaches removed from team.').replace(
                                ':count',
                                String(count),
                            ),
                        );
                    },
                }),
            {
                confirmLabel: t('Remove selected'),
                names: (coaches ?? []).flatMap((row) =>
                    row.coach && selectedCoachIds.has(row.coach.id)
                        ? [row.coach.full_name]
                        : [],
                ),
            },
        );
    }

    const detail = (label: string, value: React.ReactNode) => (
        <div className="grid gap-1">
            <dt className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                {label}
            </dt>
            <dd className="text-sm">{value ?? ''}</dd>
        </div>
    );

    function memberRoleChip(rowRole: string | null): string {
        if (rowRole === 'CAPTAIN') {
            return 'bg-amber-100 text-amber-900 border-amber-200 dark:bg-amber-950/40 dark:text-amber-200 dark:border-amber-900/60';
        }

        if (rowRole === 'RESERVE') {
            return 'bg-violet-100 text-violet-900 border-violet-200 dark:bg-violet-950/40 dark:text-violet-200 dark:border-violet-900/60';
        }

        return 'bg-sky-100 text-sky-900 border-sky-200 dark:bg-sky-950/40 dark:text-sky-200 dark:border-sky-900/60';
    }

    function memberNameWithRank(
        member: TeamMemberRow['member'] | null,
    ): string {
        if (!member?.full_name) {
            return '';
        }

        const rankLabel = member.rank ? t(member.rank) : '';

        return rankLabel
            ? `${rankLabel} ${member.full_name}`
            : member.full_name;
    }

    function memberEnglishName(
        member: TeamMemberRow['member'] | null,
    ): string | null {
        if (!member?.full_name_normalized) {
            return null;
        }

        const normalized = member.full_name_normalized.trim();

        return normalized.length > 0 && normalized !== member.full_name
            ? normalized
            : null;
    }

    function memberReactivateMeta(member: TeamMemberRow['member'] | null): string[] {
        const weight = (member as { weight?: string | null } | null)?.weight;

        return [
            member?.playable_profile?.sport_event
                ? `Event: ${member.playable_profile.sport_event}`
                : null,
            member?.playable_profile?.position
                ? `Pos: ${member.playable_profile.position}`
                : null,
            weight ? `Weight: ${weight}` : null,
        ].filter((item): item is string => item !== null);
    }

    function memberStatusTag(leftOn: string | null): React.ReactElement {
        return leftOn ? (
            <span className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-900 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-200">
                <CircleX className="h-3 w-3" />
                {t('Removed')}
            </span>
        ) : (
            <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-900 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-200">
                <CircleCheck className="h-3 w-3" />
                {t('Active')}
            </span>
        );
    }

    function coachRoleLabel(role: string | null): string {
        if (role === 'HEAD') {
            return t('Head Coach');
        }

        if (role === 'ASSISTANT') {
            return t('Assistant Coach');
        }

        return role ? t(role) : '';
    }

    const tableFallback = (
        <div className="space-y-2">
            {[1, 2, 3].map((n) => (
                <Skeleton key={n} className="h-10 w-full" />
            ))}
        </div>
    );

    const activePlayerCount = counts?.players_count ?? 0;
    const activeCoachCount = counts?.coaches_count ?? 0;
    const removedPlayerCount = removedMembers?.length ?? 0;
    const reactivateAvailableMembers = (removedMembers ?? []).filter(
        (row) => row.member,
    );
    const reactivateAvailableCoaches = (removedCoaches ?? []).filter(
        (row) => row.coach,
    );
    const reactivateMembersToShow = reactivateAvailableMembers.filter((row) => {
        if (!row.member || !reactivateMemberSearch.trim()) {
            return true;
        }

        const q = reactivateMemberSearch.toLowerCase();
        const nameMatch = row.member.full_name.toLowerCase().includes(q);
        const englishMatch = row.member.full_name_normalized
            ?.toLowerCase()
            .includes(q);
        const pnoMatch = row.member.pno?.toLowerCase().includes(q);

        return nameMatch || Boolean(englishMatch) || Boolean(pnoMatch);
    });
    const reactivateCoachesToShow = reactivateAvailableCoaches.filter((row) => {
        if (!row.coach || !reactivateCoachSearch.trim()) {
            return true;
        }

        const q = reactivateCoachSearch.toLowerCase();
        const nameMatch = row.coach.full_name.toLowerCase().includes(q);
        const englishMatch = row.coach.display_name
            ?.toLowerCase()
            .includes(q);
        const pnoMatch = row.coach.pno?.toLowerCase().includes(q);

        return nameMatch || Boolean(englishMatch) || Boolean(pnoMatch);
    });
    const selectedSession =
        sessions.find((session) => session.id === selectedSessionId) ??
        sessions[0];
    const currentSession = sessions.find((session) => session.is_current);
    const canBackfill = !!(
        selectedSession &&
        currentSession &&
        selectedSession.id !== currentSession.id
    );
    const hasFutureSession = !!(
        selectedSession &&
        currentSession &&
        selectedSession.id === currentSession.id &&
        sessions.some((session) =>
            (session.start_year !== undefined &&
                currentSession.start_year !== undefined &&
                session.start_year > currentSession.start_year &&
                session.id !== currentSession.id) ||
            (session.start_year === undefined &&
                currentSession.start_year === undefined &&
                session.id > currentSession.id &&
                session.id !== currentSession.id)
        )
    );
    const isViewingCurrentSession = !!(
        selectedSession &&
        currentSession &&
        selectedSession.id === currentSession.id
    );
    const hasSessionContext = !!(selectedSession && currentSession);
    const isViewingArchivedSession = hasSessionContext
        ? selectedSession.id !== currentSession!.id
        : false;

    const leftDateForMemberRow = (row: TeamMemberRow): string => {
        if (
            isViewingCurrentSession &&
            row.session?.id === selectedSession?.id
        ) {
            const leftOn = row.left_on?.trim() ?? '';

            if (!leftOn || leftOn.startsWith('0000-00-00')) {
                return '';
            }
        }

        return row.left_on ?? '';
    };
    // Derive unique session options from loaded rows for filter pills
    const memberSessions = Array.from(
        new Map(
            (members ?? [])
                .filter((r) => r.session)
                .map((r) => [r.session!.id, r.session!]),
        ).values(),
    );
    const coachSessions = Array.from(
        new Map(
            (coaches ?? [])
                .filter((r) => r.session)
                .map((r) => [r.session!.id, r.session!]),
        ).values(),
    );

    const filteredMembers = (members ?? []).filter((r) => {
        if (
            memberSessionFilter &&
            String(r.session?.id) !== memberSessionFilter
        ) {
            return false;
        }

        if (memberRoleFilter && r.role !== memberRoleFilter) {
            return false;
        }

        if (memberSearch) {
            const q = memberSearch.toLowerCase();
            const nameMatch = r.member?.full_name?.toLowerCase().includes(q);
            const englishMatch = r.member?.full_name_normalized
                ?.toLowerCase()
                .includes(q);
            const pnoMatch = r.member?.pno?.toLowerCase().includes(q);

            if (!nameMatch && !englishMatch && !pnoMatch) {
                return false;
            }
        }

        return true;
    });
    const showLeftOnColumn = filteredMembers.some(
        (row) => leftDateForMemberRow(row).trim() !== '',
    );
    const memberTableColumnCount = showLeftOnColumn ? 12 : 11;

    const filteredCoaches = (coaches ?? []).filter((r) => {
        if (
            coachSessionFilter &&
            String(r.session?.id) !== coachSessionFilter
        ) {
            return false;
        }

        if (coachRoleFilter && r.role !== coachRoleFilter) {
            return false;
        }

        if (coachSearch) {
            const q = coachSearch.toLowerCase();
            const nameMatch = r.coach?.full_name?.toLowerCase().includes(q);
            const englishMatch = r.coach?.display_name
                ?.toLowerCase()
                .includes(q);
            const pnoMatch = r.coach?.pno?.toLowerCase().includes(q);

            if (!nameMatch && !englishMatch && !pnoMatch) {
                return false;
            }
        }

        return true;
    });

    const memberFiltersActive = !!(
        memberSessionFilter ||
        memberRoleFilter ||
        memberSearch
    );
    const coachFiltersActive = !!(
        coachSessionFilter ||
        coachRoleFilter ||
        coachSearch
    );

    // Checkbox derived state — members
    const memberSelectableIds = filteredMembers
        .filter((r) => r.member)
        .map((r) => r.member!.id);
    const memberAllSelected =
        memberSelectableIds.length > 0 &&
        memberSelectableIds.every((id) => selectedMemberIds.has(id));
    const memberSomeSelected =
        !memberAllSelected &&
        memberSelectableIds.some((id) => selectedMemberIds.has(id));
    const memberHeaderChecked: boolean | 'indeterminate' = memberAllSelected
        ? true
        : memberSomeSelected
          ? 'indeterminate'
          : false;

    // Checkbox derived state — coaches
    const coachSelectableIds = filteredCoaches
        .filter((r) => r.coach)
        .map((r) => r.coach!.id);
    const coachAllSelected =
        coachSelectableIds.length > 0 &&
        coachSelectableIds.every((id) => selectedCoachIds.has(id));
    const coachSomeSelected =
        !coachAllSelected &&
        coachSelectableIds.some((id) => selectedCoachIds.has(id));
    const coachHeaderChecked: boolean | 'indeterminate' = coachAllSelected
        ? true
        : coachSomeSelected
          ? 'indeterminate'
          : false;

    const detailCards = [
        {
            label: t('Players'),
            value: String(activePlayerCount),
            classes:
                'bg-sky-50/80 border-sky-200/80 text-sky-900 dark:bg-sky-950/40 dark:border-sky-800 dark:text-sky-100',
        },
        {
            label: t('Coaches'),
            value: String(activeCoachCount),
            classes:
                'bg-emerald-50/80 border-emerald-200/80 text-emerald-900 dark:bg-emerald-950/40 dark:border-emerald-800 dark:text-emerald-100',
        },
        {
            label: t('Removed'),
            value: String(removedPlayerCount),
            classes:
                'bg-amber-50/80 border-amber-200/80 text-amber-900 dark:bg-amber-950/40 dark:border-amber-800 dark:text-amber-100',
        },
        {
            label: t('Session'),
            value:
                selectedSession?.name ??
                team.session?.name ??
                t('Not selected'),
            classes:
                'bg-violet-50/80 border-violet-200/80 text-violet-900 dark:bg-violet-950/40 dark:border-violet-800 dark:text-violet-100',
        },
    ];

    const tabs = [
        {
            value: 'overview',
            label: t('Overview'),
            icon: LayoutDashboard,
        },
        {
            value: 'players',
            label: t('Players'),
            count: counts?.players_count,
            icon: Users,
        },
        {
            value: 'coaches',
            label: t('Coaches'),
            count: counts?.coaches_count,
            icon: UserPlus,
        },
        {
            value: 'incharge',
            label: t('Team Prabhari'),
            icon: ShieldCheck,
        },
        {
            value: 'changelog',
            label: t('Change log'),
            icon: History,
        },
    ];

    return (
        <>
            <Head title={team.name} />

            <AlertDialog
                open={confirm.open}
                onOpenChange={(open) => setConfirm((s) => ({ ...s, open }))}
            >
                <AlertDialogContent className="sm:max-w-lg">
                    <AlertDialogHeader>
                        <AlertDialogTitle>{confirm.title}</AlertDialogTitle>
                        <AlertDialogDescription>
                            {confirm.description}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    {confirm.names.length > 0 && (
                        <div className="rounded-md border bg-muted/40 p-3">
                            <div className="mb-2 text-xs font-medium tracking-wide text-muted-foreground uppercase">
                                {t('Selected records')}
                            </div>
                            <div className="flex flex-wrap gap-1.5">
                                {confirm.names.slice(0, 8).map((name) => (
                                    <span
                                        key={name}
                                        className="rounded-md bg-background px-2 py-1 text-xs font-medium shadow-xs"
                                    >
                                        {name}
                                    </span>
                                ))}
                                {confirm.names.length > 8 && (
                                    <span className="rounded-md bg-background px-2 py-1 text-xs font-medium shadow-xs">
                                        {t('+ :count more').replace(
                                            ':count',
                                            String(confirm.names.length - 8),
                                        )}
                                    </span>
                                )}
                            </div>
                        </div>
                    )}
                    {confirm.note && (
                        <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-200">
                            {confirm.note}
                        </div>
                    )}
                    <AlertDialogFooter>
                        <AlertDialogCancel>{t('Cancel')}</AlertDialogCancel>
                        <AlertDialogAction
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            onClick={() => {
                                confirm.onConfirm();
                                setConfirm((s) => ({ ...s, open: false }));
                            }}
                        >
                            {confirm.confirmLabel}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            <Dialog
                open={removeMembersDialog.open}
                onOpenChange={(open) => !open && closeRemoveMembersDialog()}
            >
                <DialogContent
                    className="w-[96vw] max-w-[1100px] xl:max-w-[1250px] max-h-[86vh] overflow-hidden"
                    aria-describedby={undefined}
                >
                    <DialogHeader>
                        <div className="mb-2 inline-flex items-center rounded-full border border-rose-200 bg-rose-50 px-3 py-1 text-xs font-medium tracking-wide text-rose-700 dark:border-rose-900/50 dark:bg-rose-950 dark:text-rose-200">
                            <AlertTriangle className="mr-1.5 h-3.5 w-3.5" />
                            {t('Roster change')}
                        </div>
                        <DialogTitle>
                            {removeMembersDialog.memberIds.length > 1
                                ? t('Remove selected members')
                                : t('Remove member')}
                        </DialogTitle>
                    </DialogHeader>
                    <p className="text-sm text-muted-foreground">
                        {t(
                            'Selected players will be removed for this session and preserved in history.',
                        )}
                    </p>
                    <div className="max-h-[calc(86vh-14rem)] space-y-4 overflow-y-auto pr-2">
                        {removeMembersDialog.names.length > 0 && (
                            <div className="rounded-lg border border-rose-200 bg-rose-50 p-3 dark:border-rose-900/50 dark:bg-rose-950/40">
                                <div className="mb-2 text-xs font-medium tracking-wide text-rose-700 uppercase dark:text-rose-200">
                                    {t('Selected records')}
                                </div>
                                <div className="flex flex-wrap gap-1.5">
                                    {removeMembersDialog.names.map((name) => (
                                        <span
                                            key={name}
                                            className="rounded-full border border-rose-200 bg-white px-2.5 py-1 text-xs font-medium text-rose-900 dark:border-rose-900/60 dark:bg-slate-900"
                                        >
                                            {name}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        )}
                        <div className="grid gap-2">
                            <div>
                                <Label htmlFor="remove-member-left">
                                    {t('Left on')}{' '}
                                    <span className="text-destructive">*</span>
                                </Label>
                                <p className="text-xs text-muted-foreground">
                                    {t(
                                        'The date player leaves this session roster',
                                    )}
                                </p>
                            </div>
                            <Input
                                id="remove-member-left"
                                type="date"
                                value={removeMembersDialog.left_on}
                                onChange={(event) =>
                                    setRemoveMembersDialog((state) => ({
                                        ...state,
                                        left_on: event.target.value,
                                    }))
                                }
                            />
                        </div>
                        <div className="grid gap-2">
                            <div>
                                <Label htmlFor="remove-member-reason">
                                    {t('Removal reason')}{' '}
                                    <span className="text-destructive">*</span>
                                </Label>
                                <p className="text-xs text-muted-foreground">
                                    {t('Reason is required for audit trail')}
                                </p>
                            </div>
                            <Textarea
                                className="min-h-20"
                                id="remove-member-reason"
                                value={removeMembersDialog.reason}
                                onChange={(event) =>
                                    setRemoveMembersDialog((state) => ({
                                        ...state,
                                        reason: event.target.value,
                                    }))
                                }
                            />
                        </div>
                    </div>
                    <DialogFooter className="mt-2">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={closeRemoveMembersDialog}
                        >
                            {t('Cancel')}
                        </Button>
                        <Button
                            type="button"
                            variant="destructive"
                            disabled={
                                !removeMembersDialog.left_on ||
                                !removeMembersDialog.reason.trim()
                            }
                            onClick={submitRemoveMembers}
                        >
                            {t('Remove')}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Dialog
                open={reactivateSessionDialog.open}
                onOpenChange={(open) =>
                    !open && closeReactivateSessionDialog()
                }
            >
                <DialogContent
                    className="w-[96vw] max-w-[900px] xl:max-w-[1100px] max-h-[86vh] overflow-hidden"
                    aria-describedby={undefined}
                >
                    <DialogHeader>
                        <DialogTitle>
                            {t('Reactivate session')}
                        </DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                        <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/40 dark:text-amber-100">
                            {reactivateSessionDialog.mode === 'fresh'
                                ? t('This session will be marked active without restoring removed records.')
                                : t('Restore selected removed members/coaches before activating the session.')}
                        </div>

                        <div className="space-y-2">
                            <label className="flex items-start gap-2 rounded-lg border p-3 text-sm">
                                <Checkbox
                                    checked={reactivateSessionDialog.mode === 'fresh'}
                                    onCheckedChange={() =>
                                        setReactivateSessionDialog((state) => ({
                                            ...state,
                                            mode: 'fresh',
                                        }))
                                    }
                                />
                                <span>{t('Mark as fresh')}</span>
                            </label>
                            <label className="flex items-start gap-2 rounded-lg border p-3 text-sm">
                                <Checkbox
                                    checked={reactivateSessionDialog.mode === 'restore'}
                                    onCheckedChange={() =>
                                        setReactivateSessionDialog((state) => ({
                                            ...state,
                                            mode: 'restore',
                                        }))
                                    }
                                />
                                <span>{t('Restore selected removed members/coaches')}</span>
                            </label>
                        </div>

                        {reactivateSessionDialog.mode === 'restore' && (
                            <>
                                <div className="space-y-2">
                                    <div className="flex items-center justify-between gap-2">
                                        <p className="text-sm font-medium">
                                            {t('Removed members')}
                                        </p>
                                        <div className="flex gap-2">
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                size="sm"
                                                onClick={selectAllReactivateMembers}
                                                disabled={
                                                    reactivateMembersToShow.length === 0
                                                }
                                            >
                                                {t('Select all')}
                                            </Button>
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                size="sm"
                                                onClick={deselectAllReactivateMembers}
                                                disabled={reactivateSessionDialog.memberIds.length === 0}
                                            >
                                                {t('Deselect all')}
                                            </Button>
                                        </div>
                                    </div>
                                    {reactivateMembersToShow.length === 0 ? (
                                        <p className="rounded-lg border border-dashed p-2 text-sm text-muted-foreground">
                                            {t('No removed members available.')}
                                        </p>
                                    ) : (
                                        <>
                                            <div className="relative">
                                                <Input
                                                    value={reactivateMemberSearch}
                                                    onChange={(event) =>
                                                        setReactivateMemberSearch(
                                                            event.currentTarget.value,
                                                        )
                                                    }
                                                    placeholder={t(
                                                        'Search removed members by name or PNO',
                                                    )}
                                                    className="h-9 pl-8"
                                                />
                                                <Search className="pointer-events-none absolute left-2 top-2 h-4 w-4 text-muted-foreground" />
                                            </div>
                                            <div className="grid max-h-72 gap-2 overflow-y-auto rounded-lg border bg-muted/40 p-2 sm:grid-cols-2 xl:grid-cols-3">
                                                {reactivateMembersToShow.map(
                                                    (row) =>
                                                        row.member && (
                                                            <label
                                                                key={`reactivate-member-${row.member.id}`}
                                                                className="flex items-start gap-2 rounded-md border bg-background p-2 text-sm"
                                                            >
                                                                <Checkbox
                                                                    checked={reactivateSessionDialog.memberIds.includes(row.member.id)}
                                                                    onCheckedChange={() =>
                                                                        toggleRestoreMember(row.member!.id)
                                                                    }
                                                                />
                                                                <div>
                                                                    <div>
                                                                        {memberNameWithRank(
                                                                            row.member,
                                                                        )}
                                                                    </div>
                                                                    {memberEnglishName(
                                                                        row.member,
                                                                    ) && (
                                                                        <div className="mt-0.5 text-xs text-muted-foreground">
                                                                            {t('English')}
                                                                            :{' '}
                                                                            {memberEnglishName(
                                                                                row.member,
                                                                            )}
                                                                        </div>
                                                                    )}
                                                                    {memberReactivateMeta(row.member)
                                                                        .length > 0 && (
                                                                        <div className="mt-1 flex flex-wrap gap-1 text-xs text-muted-foreground">
                                                                            {memberReactivateMeta(
                                                                                row.member,
                                                                            ).map((value) => (
                                                                                <Badge
                                                                                    key={value}
                                                                                    variant="secondary"
                                                                                    className="h-6 px-2 py-0.5 text-[11px]"
                                                                                >
                                                                                    {value}
                                                                                </Badge>
                                                                            ))}
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            </label>
                                                        ),
                                                )}
                                            </div>
                                        </>
                                    )}
                                </div>
                                <div className="space-y-2">
                                    <div className="flex items-center justify-between gap-2">
                                        <p className="text-sm font-medium">
                                            {t('Removed coaches')}
                                        </p>
                                        <div className="flex gap-2">
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                size="sm"
                                                onClick={selectAllReactivateCoaches}
                                                disabled={
                                                    reactivateCoachesToShow.length === 0
                                                }
                                            >
                                                {t('Select all')}
                                            </Button>
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                size="sm"
                                                onClick={deselectAllReactivateCoaches}
                                                disabled={reactivateSessionDialog.coachIds.length === 0}
                                            >
                                                {t('Deselect all')}
                                            </Button>
                                        </div>
                                    </div>
                                    {reactivateCoachesToShow.length === 0 ? (
                                        <p className="rounded-lg border border-dashed p-2 text-sm text-muted-foreground">
                                            {t('No removed coaches available.')}
                                        </p>
                                    ) : (
                                        <>
                                            <div className="relative">
                                                <Input
                                                    value={reactivateCoachSearch}
                                                    onChange={(event) =>
                                                        setReactivateCoachSearch(
                                                            event.currentTarget.value,
                                                        )
                                                    }
                                                    placeholder={t(
                                                        'Search removed coaches by name or PNO',
                                                    )}
                                                    className="h-9 pl-8"
                                                />
                                                <Search className="pointer-events-none absolute left-2 top-2 h-4 w-4 text-muted-foreground" />
                                            </div>
                                            <div className="grid max-h-72 gap-2 overflow-y-auto rounded-lg border bg-muted/40 p-2 sm:grid-cols-2 xl:grid-cols-3">
                                                {reactivateCoachesToShow.map(
                                                    (row) =>
                                                        row.coach && (
                                                            <label
                                                                key={`reactivate-coach-${row.coach.id}`}
                                                                className="flex items-start gap-2 rounded-md border bg-background p-2 text-sm"
                                                            >
                                                                <Checkbox
                                                                    checked={reactivateSessionDialog.coachIds.includes(row.coach.id)}
                                                                    onCheckedChange={() =>
                                                                        toggleRestoreCoach(
                                                                            row.coach!.id,
                                                                        )
                                                                    }
                                                                />
                                                                <span>
                                                                    {row.coach.full_name}
                                                                    <span className="ml-2 text-xs text-muted-foreground">
                                                                        {coachRoleLabel(row.role)}
                                                                    </span>
                                                                </span>
                                                            </label>
                                                        ),
                                                )}
                                            </div>
                                        </>
                                    )}
                                </div>
                            </>
                        )}
                    </div>
                    <DialogFooter>
                        <Button
                            type="button"
                            variant="outline"
                            onClick={closeReactivateSessionDialog}
                        >
                            {t('Cancel')}
                        </Button>
                        <Button
                            type="button"
                            onClick={submitActivateSessionWithSelections}
                        >
                            {t('Confirm')}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Dialog
                open={closeSessionOpen}
                onOpenChange={(open) => !open && setCloseSessionOpen(false)}
            >
                <DialogContent
                    className="sm:max-w-lg"
                    aria-describedby={undefined}
                >
                    <DialogHeader>
                        <div className="mb-2 inline-flex items-center rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-medium tracking-wide text-amber-700 dark:border-amber-900/50 dark:bg-amber-950 dark:text-amber-200">
                            <AlertTriangle className="mr-1.5 h-3.5 w-3.5" />
                            {t('Session closure')}
                        </div>
                        <DialogTitle>{t('Mark session inactive')}</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={submitCloseSession} className="space-y-4">
                        <input
                            type="hidden"
                            name="session_id"
                            value={closeSessionForm.data.session_id}
                        />
                        <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/40 dark:text-amber-100">
                            {t(
                                'This will close active players in the selected session and mark them inactive.',
                            )}
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="close-session-date">
                                {t('Closed on')}{' '}
                                <span className="text-destructive">*</span>
                            </Label>
                            <DatePicker
                                id="close-session-date"
                                value={closeSessionForm.data.closed_on}
                                onChange={(value) =>
                                    closeSessionForm.setData(
                                        'closed_on',
                                        value,
                                    )
                                }
                            />
                            <InputError
                                message={closeSessionForm.errors.closed_on}
                            />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="close-session-reason">
                                {t('Reason')}{' '}
                                <span className="text-destructive">*</span>
                            </Label>
                            <Textarea
                                id="close-session-reason"
                                className="min-h-20"
                                value={closeSessionForm.data.reason}
                                onChange={(event) =>
                                    closeSessionForm.setData(
                                        'reason',
                                        event.target.value,
                                    )
                                }
                            />
                            <InputError
                                message={closeSessionForm.errors.reason}
                            />
                        </div>
                        <label className="flex items-start gap-2 rounded-lg border p-3 text-sm">
                            <Checkbox
                                checked={closeSessionForm.data.remove_coaches}
                                onCheckedChange={(checked) =>
                                    closeSessionForm.setData(
                                        'remove_coaches',
                                        Boolean(checked),
                                    )
                                }
                            />
                            <span>
                                {t(
                                    'Also remove current coaches from this session.',
                                )}
                            </span>
                        </label>
                        <InputError
                            message={closeSessionForm.errors.remove_coaches}
                        />
                        <label className="flex items-start gap-2 rounded-lg border p-3 text-sm">
                            <Checkbox
                                checked={closeSessionForm.data.preserve_members}
                                onCheckedChange={(checked) =>
                                    closeSessionForm.setData(
                                        'preserve_members',
                                        Boolean(checked),
                                    )
                                }
                            />
                            <span>
                                {t(
                                    'Keep active players in this session (do not remove them from roster).',
                                )}
                            </span>
                        </label>
                        <InputError
                            message={closeSessionForm.errors.preserve_members}
                        />
                        <DialogFooter>
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => setCloseSessionOpen(false)}
                            >
                                {t('Cancel')}
                            </Button>
                            <Button
                                type="submit"
                                variant="destructive"
                                disabled={
                                    closeSessionForm.processing ||
                                    !closeSessionForm.data.closed_on ||
                                    !closeSessionForm.data.reason.trim()
                                }
                            >
                                {t('Mark inactive')}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            <Dialog
                open={editingMember !== null}
                onOpenChange={(open) => !open && setEditingMember(null)}
            >
                <DialogContent
                    className="sm:max-w-md"
                    aria-describedby={undefined}
                >
                    <DialogHeader>
                        <DialogTitle>{t('Edit membership')}</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={submitMemberEdit} className="space-y-4">
                        <div className="grid gap-2">
                            <Label htmlFor="edit-member-role">
                                {t('Role')}
                            </Label>
                            <Select
                                value={editMemberData.role}
                                onValueChange={(value) =>
                                    setEditMemberData((data) => ({
                                        ...data,
                                        role: value,
                                    }))
                                }
                            >
                                <SelectTrigger
                                    id="edit-member-role"
                                    className="w-full"
                                >
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {MEMBER_ROLES.map((role) => (
                                        <SelectItem key={role} value={role}>
                                            {t(role)}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <div className="grid gap-2">
                                <Label htmlFor="edit-member-joined">
                                    {t('Joined on')}
                                </Label>
                                <Input
                                    id="edit-member-joined"
                                    type="date"
                                    value={editMemberData.joined_on}
                                    onChange={(event) =>
                                        setEditMemberData((data) => ({
                                            ...data,
                                            joined_on: event.target.value,
                                        }))
                                    }
                                />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="edit-member-left">
                                    {t('Left on')}
                                </Label>
                                <Input
                                    id="edit-member-left"
                                    type="date"
                                    value={editMemberData.left_on}
                                    onChange={(event) =>
                                        setEditMemberData((data) => ({
                                            ...data,
                                            left_on: event.target.value,
                                        }))
                                    }
                                />
                            </div>
                        </div>
                        <DialogFooter>
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => setEditingMember(null)}
                            >
                                {t('Cancel')}
                            </Button>
                            <Button type="submit">{t('Save')}</Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            <AddMemberDialog
                open={addMemberOpen}
                onOpenChange={setAddMemberOpen}
                team={team}
                sessions={sessions}
                selectedSessionId={selectedSessionId}
                onAdded={handleMembersAdded}
            />
            <BackfillMembersDialog
                open={backfillOpen}
                onOpenChange={setBackfillOpen}
                team={team}
                sessions={sessions}
                selectedSessionId={selectedSessionId}
            />
            <AddCoachDialog
                open={addCoachOpen}
                onOpenChange={setAddCoachOpen}
                team={team}
            />
            <CloneTeamDialog
                open={cloneOpen}
                onOpenChange={setCloneOpen}
                team={team}
                sessions={sessions}
                members={members}
                coaches={coaches}
            />

            <div className="space-y-5">
                <section className="relative overflow-hidden rounded-2xl border bg-card shadow-sm">
                    <div className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-slate-200 dark:bg-slate-700" />
                    <div className="pointer-events-none absolute inset-0 bg-muted/10" />
                    <div className="relative grid gap-5 p-5 md:p-6 lg:grid-cols-[minmax(0,1fr)_minmax(360px,520px)] lg:items-start">
                        <div className="space-y-4">
                            <div className="space-y-2">
                                <div className="inline-flex items-center rounded-full border border-sky-200 bg-sky-50 px-3 py-1 text-xs font-medium tracking-wide text-sky-700 dark:border-sky-800 dark:bg-sky-950 dark:text-sky-200">
                                    {team.location_type}
                                </div>
                                <h1 className="text-3xl font-semibold tracking-tight">
                                    {team.name}
                                </h1>
                                <div className="text-sm text-muted-foreground">
                                    {team.sport?.name ??
                                        team.location_label ??
                                        t('Team roster')}
                                </div>
                                <p className="text-sm text-muted-foreground">
                                    {selectedSession?.name ??
                                        sessions[0]?.name ??
                                        t('No session selected')}
                                </p>
                                <div
                                    className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-medium ${
                                        !hasSessionContext
                                            ? 'border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100'
                                            : isViewingCurrentSession
                                              ? 'border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900/70 dark:bg-emerald-950 dark:text-emerald-100'
                                              : 'border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-900/70 dark:bg-amber-950 dark:text-amber-100'
                                    }`}
                                >
                                    <span
                                        className={`h-1.5 w-1.5 rounded-full ${
                                            !hasSessionContext
                                                ? 'bg-slate-500'
                                                : isViewingCurrentSession
                                                  ? 'bg-emerald-500'
                                                  : 'bg-amber-500'
                                        }`}
                                    />
                                    {!hasSessionContext
                                        ? t('Session context unavailable')
                                        : isViewingCurrentSession
                                          ? t('Current session view')
                                          : isViewingArchivedSession
                                            ? t('Archived session view')
                                            : t('Session view')}
                                </div>
                            </div>
                            <div className="flex flex-wrap items-center gap-2">
                                <Select
                                    value={
                                        selectedSessionId
                                            ? String(selectedSessionId)
                                            : ''
                                    }
                                    onValueChange={(value) =>
                                        router.get(
                                            showTeam.url(team),
                                            {
                                                'filter[session_id]': value,
                                            },
                                            {
                                                preserveScroll: true,
                                                preserveState: true,
                                                replace: true,
                                            },
                                        )
                                    }
                                >
                                    <SelectTrigger className="w-52">
                                        <SelectValue
                                            placeholder={t('Session')}
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
                                <Badge
                                    variant={isSessionActive ? 'default' : 'secondary'}
                                    className={
                                        isSessionActive
                                            ? 'bg-emerald-600 text-white'
                                            : ''
                                    }
                                >
                                    {sessionStatusLabel}
                                </Badge>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => {
                                        window.location.href = buildExportUrl();
                                    }}
                                >
                                    <Download className="mr-1.5 h-4 w-4" />
                                    {t('Export')}
                                </Button>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={handlePrint}
                                >
                                    <Printer className="mr-1.5 h-4 w-4" />
                                    {t('Print')}
                                </Button>
                                {hasFutureSession && (
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => setCloneOpen(true)}
                                        title={t('Carry roster forward (⌘⇧D)')}
                                    >
                                        <Copy className="mr-1.5 h-4 w-4" />
                                        {t('Carry forward')}
                                    </Button>
                                )}
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={
                                        isSessionActive
                                            ? openCloseSessionDialog
                                            : submitActivateSession
                                    }
                                    disabled={!selectedSessionId}
                                >
                                    <AlertTriangle className="mr-1.5 h-4 w-4" />
                                    {isSessionActive
                                        ? t('Mark session inactive')
                                        : t('Mark session active')}
                                </Button>
                                <Button variant="outline" size="sm" asChild>
                                    <Link href={editTeam.url(team)}>
                                        {t('Edit')}
                                    </Link>
                                </Button>
                            </div>
                        </div>
                        <div className="grid gap-3 sm:grid-cols-2">
                            {detailCards.map((card) => (
                                <div
                                    key={card.label}
                                    className={`rounded-lg border ${card.classes ?? 'border-border/80 bg-card/80'} p-3`}
                                >
                                    <p
                                        className={
                                            card.classes
                                                ? 'text-xs font-medium tracking-wide text-inherit uppercase opacity-90'
                                                : 'text-xs font-medium tracking-wide text-muted-foreground uppercase'
                                        }
                                    >
                                        {card.label}
                                    </p>
                                    <p
                                        className={`mt-2 text-lg font-semibold ${
                                            card.classes
                                                ? 'text-inherit'
                                                : 'text-foreground'
                                        }`}
                                    >
                                        {card.value}
                                    </p>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>

                <Tabs value={activeTab} className="space-y-3">
                    <div className="overflow-x-auto">
                        <TabsList>
                            {tabs.map((tab) => {
                                const Icon = tab.icon;

                                return (
                                    <TabsTrigger
                                        key={tab.value}
                                        value={tab.value}
                                        asChild
                                    >
                                        <Link
                                            href={tabUrl(
                                                tab.value as TeamProfileTab,
                                            )}
                                            preserveScroll
                                            prefetch
                                        >
                                            <Icon className="h-4 w-4 shrink-0" />
                                            <span>{tab.label}</span>
                                            {tab.count !== undefined ? (
                                                <span className="rounded-full border border-muted bg-muted/80 px-2 py-0.5 text-[10px] font-semibold text-muted-foreground">
                                                    {tab.count}
                                                </span>
                                            ) : null}
                                        </Link>
                                    </TabsTrigger>
                                );
                            })}
                        </TabsList>
                    </div>

                    {/* Overview */}
                    <TabsContent value="overview" className={tabContentClass}>
                        <div className="grid gap-4 lg:grid-cols-2">
                            <div className="rounded-2xl border bg-card p-6">
                                <div className="mb-4 flex items-center justify-between gap-4">
                                    <div>
                                        <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                                            {t('Team snapshot')}
                                        </p>
                                        <h2 className="text-lg font-semibold">
                                            {t('At-a-glance profile')}
                                        </h2>
                                    </div>
                                    <p className="text-sm text-muted-foreground">
                                        {t('Quick context for daily decisions')}
                                    </p>
                                </div>
                                <dl className="grid grid-cols-2 gap-x-8 gap-y-5 md:grid-cols-3">
                                    {detail(t('Team name'), team.name)}
                                    {detail(t('Sport'), team.sport?.name)}
                                    {detail(
                                        t('Session'),
                                        selectedSession?.name,
                                    )}
                                    {detail(t('Location'), team.location_label)}
                                    {detail(t('District'), team.district?.name)}
                                    {detail(t('Unit'), team.unit?.name)}
                                </dl>
                            </div>
                            <div className="space-y-3">
                                <div className="rounded-2xl border bg-card p-6">
                                    <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                                        {t('Operational status')}
                                    </p>
                                    <dl className="mt-4 grid gap-3 sm:grid-cols-2">
                                        {detail(
                                            t('Status'),
                                            sessionStatusLabel,
                                        )}
                                        {detail(
                                            t('In-charge'),
                                            team.current_incharge_name ??
                                                team.in_charge,
                                        )}
                                        {detail(
                                            t('PNO'),
                                            team.current_incharge_pno,
                                        )}
                                        <Deferred
                                            data="counts"
                                            fallback={
                                                <div className="h-10 animate-pulse rounded bg-muted" />
                                            }
                                        >
                                            <>
                                                {detail(
                                                    t('Players'),
                                                    counts?.players_count,
                                                )}
                                                {detail(
                                                    t('Coaches'),
                                                    counts?.coaches_count,
                                                )}
                                                {detail(
                                                    t('Removed'),
                                                    removedPlayerCount,
                                                )}
                                            </>
                                        </Deferred>
                                    </dl>
                                </div>
                                <div className="rounded-2xl border bg-muted/40 p-6">
                                    <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                                        {t('Quick pointers')}
                                    </p>
                                    <ul className="mt-4 space-y-2 text-sm text-muted-foreground">
                                        <li>
                                            {t(
                                                'Selected session roster is used as the source of truth for active membership.',
                                            )}
                                        </li>
                                        <li>
                                            {t(
                                                'Use Backfill to add history records safely for past sessions.',
                                            )}
                                        </li>
                                    </ul>
                                </div>
                            </div>
                        </div>
                    </TabsContent>

                    {/* Players */}
                    <TabsContent value="players" className={tabContentClass}>
                        <div className="space-y-3">
                            {/* Tab header: filter pills + Add button */}
                            <div className="rounded-lg border bg-card p-3 dark:bg-slate-950/70">
                                <Deferred data="members" fallback={<></>}>
                                    <div className="flex flex-wrap items-center gap-2">
                                        {memberSessions.length > 1 && (
                                            <Select
                                                value={
                                                    memberSessionFilter ||
                                                    '_all'
                                                }
                                                onValueChange={(v) =>
                                                    setMemberSessionFilter(
                                                        v === '_all' ? '' : v,
                                                    )
                                                }
                                            >
                                                <SelectTrigger className="h-8 w-auto min-w-36 gap-2 px-2.5">
                                                    <SelectValue
                                                        placeholder={t(
                                                            'Session',
                                                        )}
                                                    />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="_all">
                                                        {t('All sessions')}
                                                    </SelectItem>
                                                    {memberSessions.map((s) => (
                                                        <SelectItem
                                                            key={s.id}
                                                            value={String(s.id)}
                                                        >
                                                            {s.name}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        )}
                                        <Select
                                            value={memberRoleFilter || '_all'}
                                            onValueChange={(v) =>
                                                setMemberRoleFilter(
                                                    v === '_all' ? '' : v,
                                                )
                                            }
                                        >
                                            <SelectTrigger className="h-8 w-auto min-w-28 gap-2 px-2.5">
                                                <SelectValue
                                                    placeholder={t('Role')}
                                                />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="_all">
                                                    {t('All roles')}
                                                </SelectItem>
                                                {MEMBER_ROLES.map((r) => (
                                                    <SelectItem
                                                        key={r}
                                                        value={r}
                                                    >
                                                        {t(r)}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                        <div className="relative min-w-44 flex-1">
                                            <Search className="pointer-events-none absolute top-1/2 left-2.5 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                                            <Input
                                                placeholder={t(
                                                    'Search by name or PNO…',
                                                )}
                                                value={memberSearch}
                                                onChange={(e) =>
                                                    setMemberSearch(
                                                        e.target.value,
                                                    )
                                                }
                                                className="h-8 w-full pl-9 text-sm"
                                            />
                                        </div>
                                        {memberFiltersActive && (
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => {
                                                    setMemberSessionFilter('');
                                                    setMemberRoleFilter('');
                                                    setMemberSearch('');
                                                }}
                                            >
                                                {t('Clear')}
                                            </Button>
                                        )}
                                        {memberFiltersActive && (
                                            <span className="rounded-full border border-muted bg-muted/40 px-2 py-1 text-xs text-muted-foreground">
                                                {t(':n results').replace(
                                                    ':n',
                                                    String(
                                                        filteredMembers.length,
                                                    ),
                                                )}
                                            </span>
                                        )}
                                    </div>
                                </Deferred>
                                <div className="mt-2 flex flex-wrap items-center justify-end gap-2">
                                    {selectedMemberIds.size > 0 && (
                                        <Button
                                            size="sm"
                                            variant="destructive"
                                            onClick={handleBulkRemoveMembers}
                                        >
                                            <Trash2 className="mr-1.5 h-4 w-4" />
                                            {t(
                                                'Remove selected (:count)',
                                            ).replace(
                                                ':count',
                                                String(selectedMemberIds.size),
                                            )}
                                        </Button>
                                    )}
                                    {canBackfill && (
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            onClick={() =>
                                                setBackfillOpen(true)
                                            }
                                        >
                                            <ArchiveRestore className="mr-1.5 h-4 w-4" />
                                            {t('Backfill')}
                                        </Button>
                                    )}
                                    <Button
                                        size="sm"
                                        onClick={() => setAddMemberOpen(true)}
                                        title={t('Add member (⌘⇧M)')}
                                    >
                                        <UserPlus className="mr-1.5 h-4 w-4" />
                                        {t('Add member')}
                                    </Button>
                                </div>
                            </div>

                            <Deferred data="members" fallback={tableFallback}>
                                <div className="overflow-x-auto rounded-2xl border bg-card p-4 shadow-sm">
                                    <div className="min-w-[1120px]">
                                        <Table>
                                            <TableHeader>
                                                <TableRow className="bg-muted/70">
                                                    <TableHead className="w-10">
                                                        <Checkbox
                                                            checked={
                                                                memberHeaderChecked
                                                            }
                                                            onCheckedChange={() =>
                                                                toggleAllMembers(
                                                                    memberSelectableIds,
                                                                )
                                                            }
                                                            aria-label={t(
                                                                'Select all',
                                                            )}
                                                        />
                                                    </TableHead>
                                                    <TableHead>
                                                        {t('Name')}
                                                    </TableHead>
                                                    <TableHead className="hidden sm:table-cell">
                                                        {t('PNO')}
                                                    </TableHead>
                                                    <TableHead>
                                                        {t('Role')}
                                                    </TableHead>
                                                    <TableHead className="min-w-44">
                                                        {t('Event / Weight')}
                                                    </TableHead>
                                                    <TableHead className="hidden lg:table-cell">
                                                        {t('Posting')}
                                                    </TableHead>
                                                    <TableHead className="hidden lg:table-cell">
                                                        {t('Phone')}
                                                    </TableHead>
                                                    <TableHead className="hidden xl:table-cell">
                                                        {t('Status')}
                                                    </TableHead>
                                                    <TableHead className="hidden lg:table-cell">
                                                        {t('Session')}
                                                    </TableHead>
                                                    <TableHead className="hidden md:table-cell">
                                                        {t('Joined on')}
                                                    </TableHead>
                                                    {showLeftOnColumn ? (
                                                        <TableHead className="hidden lg:table-cell">
                                                            {t('Left on')}
                                                        </TableHead>
                                                    ) : null}
                                                    <TableHead />
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {filteredMembers.length ===
                                                0 ? (
                                                    <TableRow>
                                                        <TableCell
                                                            colSpan={memberTableColumnCount}
                                                            className="text-center text-muted-foreground"
                                                        >
                                                            {t(
                                                                'No members in this team.',
                                                            )}
                                                        </TableCell>
                                                    </TableRow>
                                                ) : (
                                                    filteredMembers.map(
                                                        (row, index) => {
                                                            const isHighlighted =
                                                                !!(
                                                                    row.member &&
                                                                    highlightedMemberIds.has(
                                                                        row
                                                                            .member
                                                                            .id,
                                                                    )
                                                                );
                                                            const playableProfile =
                                                                row.member
                                                                    ?.playable_profile;
                                                            const playableProfileMeta =
                                                                [
                                                                    playableProfile?.role
                                                                        ? `${t('Role')}: ${playableProfile.role}`
                                                                        : null,
                                                                    playableProfile?.position
                                                                        ? `${t('Position')}: ${playableProfile.position}`
                                                                        : null,
                                                                ].filter(
                                                                    Boolean,
                                                                );

                                                            return (
                                                                <TableRow
                                                                    key={row.id}
                                                                    id={
                                                                        row.member
                                                                            ? `team-member-${row.member.id}`
                                                                            : undefined
                                                                    }
                                                                    style={{
                                                                        animationDelay: `${index * 20}ms`,
                                                                    }}
                                                                    data-state={
                                                                        row.member &&
                                                                        selectedMemberIds.has(
                                                                            row
                                                                                .member
                                                                                .id,
                                                                        )
                                                                            ? 'selected'
                                                                            : undefined
                                                                    }
                                                                    className={
                                                                        isHighlighted
                                                                            ? 'animate-in bg-emerald-50 ring-1 ring-emerald-300 transition-all duration-200 fade-in-0 ring-inset hover:-translate-y-0.5 hover:bg-muted/30 dark:bg-emerald-950/30 dark:ring-emerald-800'
                                                                            : 'animate-in transition-all duration-200 fade-in-0 hover:-translate-y-0.5 hover:bg-muted/30'
                                                                    }
                                                                >
                                                                    <TableCell>
                                                                        <Checkbox
                                                                            checked={
                                                                                !!(
                                                                                    row.member &&
                                                                                    selectedMemberIds.has(
                                                                                        row
                                                                                            .member
                                                                                            .id,
                                                                                    )
                                                                                )
                                                                            }
                                                                            onCheckedChange={() =>
                                                                                row.member &&
                                                                                toggleMember(
                                                                                    row
                                                                                        .member
                                                                                        .id,
                                                                                )
                                                                            }
                                                                            disabled={
                                                                                !row.member
                                                                            }
                                                                            aria-label={
                                                                                row
                                                                                    .member
                                                                                    ?.full_name
                                                                            }
                                                                        />
                                                                    </TableCell>
                                                                    <TableCell className="font-medium">
                                                                        {row.member ? (
                                                                            <Link
                                                                                href={MemberController.show.url(
                                                                                    row
                                                                                        .member
                                                                                        .id,
                                                                                )}
                                                                                target="_blank"
                                                                                rel="noreferrer"
                                                                                className="text-primary hover:underline"
                                                                            >
                                                                                {memberNameWithRank(
                                                                                    row.member,
                                                                                )}
                                                                            </Link>
                                                                        ) : (
                                                                            ''
                                                                        )}
                                                                    </TableCell>
                                                                    <TableCell className="hidden font-mono text-sm sm:table-cell">
                                                                        {row
                                                                            .member
                                                                            ?.pno ? (
                                                                            <Link
                                                                                href={MemberController.show.url(
                                                                                    row
                                                                                        .member
                                                                                        .id,
                                                                                )}
                                                                                target="_blank"
                                                                                rel="noreferrer"
                                                                                className="text-primary hover:underline"
                                                                            >
                                                                                {
                                                                                    row
                                                                                        .member
                                                                                        .pno
                                                                                }
                                                                            </Link>
                                                                        ) : (
                                                                            ''
                                                                        )}
                                                                    </TableCell>
                                                                    <TableCell>
                                                                        <span
                                                                            className={`inline-flex rounded-full border px-2 py-0.5 text-xs font-medium ${memberRoleChip(
                                                                                row.role,
                                                                            )}`}
                                                                        >
                                                                            {row.role
                                                                                ? t(
                                                                                      row.role,
                                                                                  )
                                                                                : ''}
                                                                        </span>
                                                                    </TableCell>
                                                                    <TableCell className="min-w-44">
                                                                        {playableProfile ? (
                                                                            <div className="space-y-0.5">
                                                                                {playableProfile.sport_event ? (
                                                                                    <div className="text-sm font-medium">
                                                                                        {
                                                                                            playableProfile.sport_event
                                                                                        }
                                                                                    </div>
                                                                                ) : null}
                                                                                {playableProfileMeta.length >
                                                                                0 ? (
                                                                                    <div className="text-xs text-muted-foreground">
                                                                                        {playableProfileMeta.join(
                                                                                            ' · ',
                                                                                        )}
                                                                                    </div>
                                                                                ) : null}
                                                                            </div>
                                                                        ) : (
                                                                            <span className="text-sm text-muted-foreground">
                                                                                —
                                                                            </span>
                                                                        )}
                                                                    </TableCell>
                                                                    <TableCell className="hidden lg:table-cell">
                                                                        <div className="text-sm">
                                                                            {row
                                                                                .member
                                                                                ?.current_unit
                                                                                ?.name ??
                                                                                ''}
                                                                        </div>
                                                                    </TableCell>
                                                                    <TableCell className="hidden lg:table-cell">
                                                                        {row
                                                                            .member
                                                                            ?.mobile ??
                                                                            ''}
                                                                    </TableCell>
                                                                    <TableCell className="hidden xl:table-cell">
                                                                        {memberStatusTag(
                                                                            row.left_on,
                                                                        )}
                                                                    </TableCell>
                                                                    <TableCell className="hidden lg:table-cell">
                                                                        {row
                                                                            .session
                                                                            ?.name ??
                                                                            ''}
                                                                    </TableCell>
                                                                <TableCell className="hidden md:table-cell">
                                                            {row.joined_on ??
                                                                ''}
                                                        </TableCell>
                                                        {showLeftOnColumn ? (
                                                            <TableCell className="hidden lg:table-cell">
                                                                {leftDateForMemberRow(
                                                                    row,
                                                                )}
                                                            </TableCell>
                                                        ) : null}
                                                        <TableCell className="text-right">
                                                            <div className="flex items-center justify-end gap-1">
                                                                            <Button
                                                                                variant="ghost"
                                                                                size="icon"
                                                                                title={t(
                                                                                    'Quick info',
                                                                                )}
                                                                                onClick={() =>
                                                                                    setMemberQuickViewId(
                                                                                        row
                                                                                            .member
                                                                                            ?.id ??
                                                                                            null,
                                                                                    )
                                                                                }
                                                                                disabled={
                                                                                    !row.member
                                                                                }
                                                                            >
                                                                                <Info className="h-4 w-4" />
                                                                            </Button>
                                                                            <Button
                                                                                variant="ghost"
                                                                                size="icon"
                                                                                title={t(
                                                                                    'Edit membership',
                                                                                )}
                                                                                onClick={() =>
                                                                                    openMemberEdit(
                                                                                        row,
                                                                                    )
                                                                                }
                                                                                disabled={
                                                                                    !row.member
                                                                                }
                                                                            >
                                                                                <Pencil className="h-4 w-4" />
                                                                            </Button>
                                                                            <Button
                                                                                variant="ghost"
                                                                                size="sm"
                                                                                onClick={() =>
                                                                                    row.member &&
                                                                                    removeMember(
                                                                                        row
                                                                                            .member
                                                                                            .id,
                                                                                        row
                                                                                            .member
                                                                                            .full_name,
                                                                                    )
                                                                                }
                                                                                disabled={
                                                                                    !row.member
                                                                                }
                                                                            >
                                                                                {t(
                                                                                    'Remove',
                                                                                )}
                                                                            </Button>
                                                                        </div>
                                                                    </TableCell>
                                                                </TableRow>
                                                            );
                                                        },
                                                    )
                                                )}
                                            </TableBody>
                                        </Table>
                                    </div>
                                </div>
                            </Deferred>

                            <Deferred data="removedMembers" fallback={<></>}>
                                <div className="overflow-x-auto rounded-2xl border bg-card p-4">
                                    <div className="mb-3 flex items-center justify-between gap-3">
                                        <div>
                                            <h3 className="text-sm font-semibold">
                                                {t('Removed roster')}
                                            </h3>
                                            <p className="text-xs text-muted-foreground">
                                                {t(
                                                    'Players removed from the selected session',
                                                )}
                                            </p>
                                        </div>
                                        <Badge variant="outline">
                                            {String(
                                                (removedMembers ?? []).length,
                                            )}
                                        </Badge>
                                    </div>
                                    <div className="min-w-[780px]">
                                        <Table>
                                            <TableHeader>
                                                <TableRow className="bg-muted">
                                                    <TableHead>
                                                        {t('Name')}
                                                    </TableHead>
                                                    <TableHead className="hidden sm:table-cell">
                                                        {t('PNO')}
                                                    </TableHead>
                                                    <TableHead className="hidden md:table-cell">
                                                        {t('Role')}
                                                    </TableHead>
                                                    <TableHead className="hidden lg:table-cell">
                                                        {t('Posting')}
                                                    </TableHead>
                                                    <TableHead className="hidden lg:table-cell">
                                                        {t('Phone')}
                                                    </TableHead>
                                                    <TableHead>
                                                        {t('Joined on')}
                                                    </TableHead>
                                                    <TableHead className="hidden md:table-cell">
                                                        {t('Left on')}
                                                    </TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {(removedMembers ?? [])
                                                    .length === 0 ? (
                                                    <TableRow>
                                                        <TableCell
                                                            colSpan={8}
                                                            className="text-center text-muted-foreground"
                                                        >
                                                            {t(
                                                                'No removed members for this session.',
                                                            )}
                                                        </TableCell>
                                                    </TableRow>
                                                ) : (
                                                    (removedMembers ?? []).map(
                                                        (row) => (
                                                            <TableRow
                                                                key={row.id}
                                                            >
                                                                <TableCell className="font-medium">
                                                                    {memberNameWithRank(
                                                                        row.member,
                                                                    )}
                                                                </TableCell>
                                                                <TableCell className="hidden font-mono text-sm sm:table-cell">
                                                                    {row.member
                                                                        ?.pno ??
                                                                        ''}
                                                                </TableCell>
                                                                <TableCell className="hidden md:table-cell">
                                                                    {row.role
                                                                        ? t(
                                                                              row.role,
                                                                          )
                                                                        : ''}
                                                                </TableCell>
                                                                <TableCell className="hidden lg:table-cell">
                                                                    {row.member
                                                                        ?.current_unit
                                                                        ?.name ??
                                                                        ''}
                                                                </TableCell>
                                                                <TableCell className="hidden lg:table-cell">
                                                                    {row.member
                                                                        ?.mobile ??
                                                                        ''}
                                                                </TableCell>
                                                                <TableCell>
                                                                    {row.joined_on ??
                                                                        ''}
                                                                </TableCell>
                                                                <TableCell className="hidden md:table-cell">
                                                                    {row.left_on ??
                                                                        ''}
                                                                </TableCell>
                                                            </TableRow>
                                                        ),
                                                    )
                                                )}
                                            </TableBody>
                                        </Table>
                                    </div>
                                </div>
                            </Deferred>

                            <Deferred data="memberMovements" fallback={<></>}>
                                <div className="overflow-x-auto rounded-2xl border bg-card p-4">
                                    <div className="mb-3 flex items-center justify-between gap-3">
                                        <div>
                                            <h3 className="text-sm font-semibold">
                                                {t('Roster movement')}
                                            </h3>
                                            <p className="text-xs text-muted-foreground">
                                                {t(
                                                    'Session add and remove history',
                                                )}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="min-w-[860px]">
                                        <Table>
                                            <TableHeader>
                                                <TableRow className="bg-muted">
                                                    <TableHead>
                                                        {t('Action')}
                                                    </TableHead>
                                                    <TableHead>
                                                        {t('Name')}
                                                    </TableHead>
                                                    <TableHead className="hidden sm:table-cell">
                                                        {t('Role')}
                                                    </TableHead>
                                                    <TableHead className="hidden md:table-cell">
                                                        {t('Effective on')}
                                                    </TableHead>
                                                    <TableHead className="hidden md:table-cell">
                                                        {t('Source')}
                                                    </TableHead>
                                                    <TableHead className="hidden lg:table-cell">
                                                        {t('Reason')}
                                                    </TableHead>
                                                    <TableHead className="hidden xl:table-cell">
                                                        {t('Recorded by')}
                                                    </TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {(memberMovements ?? [])
                                                    .length === 0 ? (
                                                    <TableRow>
                                                        <TableCell
                                                            colSpan={7}
                                                            className="text-center text-muted-foreground"
                                                        >
                                                            {t(
                                                                'No roster movement recorded for this session.',
                                                            )}
                                                        </TableCell>
                                                    </TableRow>
                                                ) : (
                                                    (memberMovements ?? []).map(
                                                        (movement) => (
                                                            <TableRow
                                                                key={
                                                                    movement.id
                                                                }
                                                            >
                                                                <TableCell>
                                                                    <Badge variant="outline">
                                                                        {t(
                                                                            movement.action,
                                                                        )}
                                                                    </Badge>
                                                                </TableCell>
                                                                <TableCell className="font-medium">
                                                                    {movement
                                                                        .member
                                                                        ?.full_name ??
                                                                        ''}
                                                                </TableCell>
                                                                <TableCell className="hidden sm:table-cell">
                                                                    {movement.role
                                                                        ? t(
                                                                              movement.role,
                                                                          )
                                                                        : ''}
                                                                </TableCell>
                                                                <TableCell className="hidden md:table-cell">
                                                                    {movement.effective_on ??
                                                                        movement.created_at ??
                                                                        ''}
                                                                </TableCell>
                                                                <TableCell className="hidden md:table-cell">
                                                                    {movement.source
                                                                        ? t(
                                                                              movement.source,
                                                                          )
                                                                        : ''}
                                                                </TableCell>
                                                                <TableCell className="hidden max-w-xs text-xs text-muted-foreground lg:table-cell">
                                                                    {movement.reason ??
                                                                        ''}
                                                                </TableCell>
                                                                <TableCell className="hidden xl:table-cell">
                                                                    {movement
                                                                        .created_by
                                                                        ?.name ??
                                                                        ''}
                                                                </TableCell>
                                                            </TableRow>
                                                        ),
                                                    )
                                                )}
                                            </TableBody>
                                        </Table>
                                    </div>
                                </div>
                            </Deferred>
                        </div>
                    </TabsContent>

                    {/* Coaches */}
                    <TabsContent value="coaches" className={tabContentClass}>
                        <div className="space-y-3">
                            {/* Tab header: filter pills + Add button */}
                            <div className="rounded-lg border bg-card p-3 dark:bg-slate-950/70">
                                <Deferred data="coaches" fallback={<></>}>
                                    <div className="flex flex-wrap items-center gap-2">
                                        {coachSessions.length > 1 && (
                                            <Select
                                                value={
                                                    coachSessionFilter || '_all'
                                                }
                                                onValueChange={(v) =>
                                                    setCoachSessionFilter(
                                                        v === '_all' ? '' : v,
                                                    )
                                                }
                                            >
                                                <SelectTrigger className="h-8 w-auto min-w-36 gap-2 px-2.5">
                                                    <SelectValue
                                                        placeholder={t(
                                                            'Session',
                                                        )}
                                                    />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="_all">
                                                        {t('All sessions')}
                                                    </SelectItem>
                                                    {coachSessions.map((s) => (
                                                        <SelectItem
                                                            key={s.id}
                                                            value={String(s.id)}
                                                        >
                                                            {s.name}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        )}
                                        <Select
                                            value={coachRoleFilter || '_all'}
                                            onValueChange={(v) =>
                                                setCoachRoleFilter(
                                                    v === '_all' ? '' : v,
                                                )
                                            }
                                        >
                                            <SelectTrigger className="h-8 w-auto min-w-28 gap-2 px-2.5">
                                                <SelectValue
                                                    placeholder={t('Role')}
                                                />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="_all">
                                                    {t('All roles')}
                                                </SelectItem>
                                                {COACH_ROLES.map((r) => (
                                                    <SelectItem
                                                        key={r}
                                                        value={r}
                                                    >
                                                        {coachRoleLabel(r)}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                        <div className="relative min-w-44 flex-1">
                                            <Search className="pointer-events-none absolute top-1/2 left-2.5 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                                            <Input
                                                placeholder={t(
                                                    'Search by name or PNO…',
                                                )}
                                                value={coachSearch}
                                                onChange={(e) =>
                                                    setCoachSearch(
                                                        e.target.value,
                                                    )
                                                }
                                                className="h-8 w-full pl-9 text-sm"
                                            />
                                        </div>
                                        {coachFiltersActive && (
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => {
                                                    setCoachSessionFilter('');
                                                    setCoachRoleFilter('');
                                                    setCoachSearch('');
                                                }}
                                            >
                                                {t('Clear')}
                                            </Button>
                                        )}
                                        {coachFiltersActive && (
                                            <span className="rounded-full border border-muted bg-muted/40 px-2 py-1 text-xs text-muted-foreground">
                                                {t(':n results').replace(
                                                    ':n',
                                                    String(
                                                        filteredCoaches.length,
                                                    ),
                                                )}
                                            </span>
                                        )}
                                    </div>
                                </Deferred>
                                <div className="mt-2 flex flex-wrap items-center justify-end gap-2">
                                    {selectedCoachIds.size > 0 && (
                                        <Button
                                            size="sm"
                                            variant="destructive"
                                            onClick={handleBulkRemoveCoaches}
                                        >
                                            <Trash2 className="mr-1.5 h-4 w-4" />
                                            {t(
                                                'Remove selected (:count)',
                                            ).replace(
                                                ':count',
                                                String(selectedCoachIds.size),
                                            )}
                                        </Button>
                                    )}
                                    <Button
                                        size="sm"
                                        onClick={() => setAddCoachOpen(true)}
                                        title={t('Add coach (⌘⇧H)')}
                                    >
                                        <Users className="mr-1.5 h-4 w-4" />
                                        {t('Add coach')}
                                    </Button>
                                </div>
                            </div>

                            <Deferred data="coaches" fallback={tableFallback}>
                                <div className="overflow-x-auto rounded-2xl border bg-card p-4 shadow-sm">
                                    <div className="min-w-[840px]">
                                        <Table>
                                            <TableHeader>
                                                <TableRow className="bg-muted/40">
                                                    <TableHead className="w-10">
                                                        <Checkbox
                                                            checked={
                                                                coachHeaderChecked
                                                            }
                                                            onCheckedChange={() =>
                                                                toggleAllCoaches(
                                                                    coachSelectableIds,
                                                                )
                                                            }
                                                            aria-label={t(
                                                                'Select all',
                                                            )}
                                                        />
                                                    </TableHead>
                                                    <TableHead>
                                                        {t('Name')}
                                                    </TableHead>
                                                    <TableHead className="hidden sm:table-cell">
                                                        {t('PNO')}
                                                    </TableHead>
                                                    <TableHead>
                                                        {t('Role')}
                                                    </TableHead>
                                                    <TableHead className="min-w-44">
                                                        {t('Event / Weight')}
                                                    </TableHead>
                                                    <TableHead className="hidden md:table-cell">
                                                        {t('Assigned on')}
                                                    </TableHead>
                                                    <TableHead className="hidden lg:table-cell">
                                                        {t('Session')}
                                                    </TableHead>
                                                    <TableHead />
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {filteredCoaches.length ===
                                                0 ? (
                                                    <TableRow>
                                                        <TableCell
                                                            colSpan={8}
                                                            className="text-center text-muted-foreground"
                                                        >
                                                            {t(
                                                                'No coaches in this team.',
                                                            )}
                                                        </TableCell>
                                                    </TableRow>
                                                ) : (
                                                    filteredCoaches.map(
                                                        (row, index) => {
                                                            const sportProfile =
                                                                row.coach
                                                                    ?.sport_profile;
                                                            const profileMeta =
                                                                sportProfile?.level
                                                                    ? [
                                                                          `${t('Level')}: ${sportProfile.level}`,
                                                                      ]
                                                                    : [];

                                                            return (
                                                                <TableRow
                                                                    key={row.id}
                                                                    style={{
                                                                        animationDelay: `${index * 20}ms`,
                                                                    }}
                                                                    className="animate-in transition-all duration-200 fade-in-0 hover:-translate-y-0.5 hover:bg-muted/30"
                                                                    data-state={
                                                                        row.coach &&
                                                                        selectedCoachIds.has(
                                                                            row
                                                                                .coach
                                                                                .id,
                                                                        )
                                                                            ? 'selected'
                                                                            : undefined
                                                                    }
                                                                >
                                                                <TableCell>
                                                                    <Checkbox
                                                                        checked={
                                                                            !!(
                                                                                row.coach &&
                                                                                selectedCoachIds.has(
                                                                                    row
                                                                                        .coach
                                                                                        .id,
                                                                                )
                                                                            )
                                                                        }
                                                                        onCheckedChange={() =>
                                                                            row.coach &&
                                                                            toggleCoach(
                                                                                row
                                                                                    .coach
                                                                                    .id,
                                                                            )
                                                                        }
                                                                        disabled={
                                                                            !row.coach
                                                                        }
                                                                        aria-label={
                                                                            row
                                                                                .coach
                                                                                ?.full_name
                                                                        }
                                                                    />
                                                                </TableCell>
                                                                <TableCell className="font-medium">
                                                                    {row.coach ? (
                                                                        <Link
                                                                            href={CoachController.show.url(
                                                                                row
                                                                                    .coach
                                                                                    .id,
                                                                            )}
                                                                            target="_blank"
                                                                            rel="noreferrer"
                                                                            className="text-primary hover:underline"
                                                                        >
                                                                            {
                                                                                row
                                                                                    .coach
                                                                                    .full_name
                                                                            }
                                                                        </Link>
                                                                    ) : (
                                                                        ''
                                                                    )}
                                                                </TableCell>
                                                                <TableCell className="hidden font-mono text-sm sm:table-cell">
                                                                    {row.coach
                                                                        ?.pno ? (
                                                                        <Link
                                                                            href={CoachController.show.url(
                                                                                row
                                                                                    .coach
                                                                                    .id,
                                                                            )}
                                                                            target="_blank"
                                                                            rel="noreferrer"
                                                                            className="text-primary hover:underline"
                                                                        >
                                                                            {
                                                                                row
                                                                                    .coach
                                                                                    .pno
                                                                            }
                                                                        </Link>
                                                                    ) : (
                                                                        ''
                                                                    )}
                                                                </TableCell>
                                                                <TableCell>
                                                                    {coachRoleLabel(
                                                                        row.role,
                                                                    )}
                                                                </TableCell>
                                                                <TableCell className="min-w-44">
                                                                    {sportProfile ? (
                                                                        <div className="space-y-0.5">
                                                                            {sportProfile.sport_event ? (
                                                                                <div className="text-sm font-medium">
                                                                                    {
                                                                                        sportProfile.sport_event
                                                                                    }
                                                                                </div>
                                                                            ) : null}
                                                                            {profileMeta.length >
                                                                            0 ? (
                                                                                <div className="text-xs text-muted-foreground">
                                                                                    {profileMeta.join(
                                                                                        ' · ',
                                                                                    )}
                                                                                </div>
                                                                            ) : null}
                                                                        </div>
                                                                    ) : (
                                                                        <span className="text-sm text-muted-foreground">
                                                                            —
                                                                        </span>
                                                                    )}
                                                                </TableCell>
                                                                <TableCell className="hidden md:table-cell">
                                                                    {row.assigned_at ??
                                                                        ''}
                                                                </TableCell>
                                                                <TableCell className="hidden lg:table-cell">
                                                                    {row.session
                                                                        ?.name ??
                                                                        ''}
                                                                </TableCell>
                                                                <TableCell className="text-right">
                                                                    <div className="flex items-center justify-end gap-1">
                                                                        <Button
                                                                            variant="ghost"
                                                                            size="icon"
                                                                            title={t(
                                                                                'Quick info',
                                                                            )}
                                                                            onClick={() =>
                                                                                setCoachQuickViewId(
                                                                                    row
                                                                                        .coach
                                                                                        ?.id ??
                                                                                        null,
                                                                                )
                                                                            }
                                                                            disabled={
                                                                                !row.coach
                                                                            }
                                                                        >
                                                                            <Info className="h-4 w-4" />
                                                                        </Button>
                                                                        <Button
                                                                            variant="ghost"
                                                                            size="sm"
                                                                            onClick={() =>
                                                                                row.coach &&
                                                                                removeCoach(
                                                                                    row
                                                                                        .coach
                                                                                        .id,
                                                                                    row
                                                                                        .coach
                                                                                        .full_name,
                                                                                )
                                                                            }
                                                                            disabled={
                                                                                !row.coach
                                                                            }
                                                                        >
                                                                            {t(
                                                                                'Remove',
                                                                            )}
                                                                        </Button>
                                                                    </div>
                                                                </TableCell>
                                                            </TableRow>
                                                            );
                                                        },
                                                    )
                                                )}
                                            </TableBody>
                                        </Table>
                                    </div>
                                </div>
                            </Deferred>
                        </div>
                    </TabsContent>

                    <TabsContent value="incharge" className={tabContentClass}>
                        <Deferred
                            data="inchargeHistory"
                            fallback={
                                <div className="rounded-xl border bg-card p-6">
                                    <Skeleton className="h-24 w-full" />
                                </div>
                            }
                        >
                            <TeamInchargePanel
                                teamId={team.id}
                                teamIsActive={isSessionActive}
                                currentAssignment={
                                    team.current_incharge_assignment
                                }
                                history={inchargeHistory}
                                incharges={incharges}
                            />
                        </Deferred>
                    </TabsContent>

                    {/* Change log */}
                    <TabsContent value="changelog" className={tabContentClass}>
                        <Deferred
                            data="auditLog"
                            fallback={
                                <div className="space-y-2">
                                    {[1, 2, 3].map((n) => (
                                        <Skeleton
                                            key={n}
                                            className="h-14 w-full"
                                        />
                                    ))}
                                </div>
                            }
                        >
                            <ChangeLog
                                entries={auditLog}
                                primaryEntity="Team"
                                storageKey="team-changelog-view"
                            />
                        </Deferred>
                    </TabsContent>
                </Tabs>
            </div>
            <MemberQuickView
                memberId={memberQuickViewId}
                open={memberQuickViewId !== null}
                onClose={() => setMemberQuickViewId(null)}
            />
            <CoachQuickView
                coachId={coachQuickViewId}
                open={coachQuickViewId !== null}
                onClose={() => setCoachQuickViewId(null)}
            />
        </>
    );
}
