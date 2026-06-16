import { router, useForm, useHttp } from '@inertiajs/react';
import { AlertTriangle, CheckCircle2, CircleSlash, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import {
    backfill,
    previewBackfill,
} from '@/actions/App/Http/Controllers/TeamMemberController';
import InputError from '@/components/input-error';
import { MemberPicker } from '@/components/member-picker';
import type { MemberOption } from '@/components/member-picker';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
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
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import { useTranslation } from '@/hooks/use-translation';

type Session = { id: number; name: string };
type Team = {
    id: number;
    sport: { id: number; name: string } | null;
};

type BackfillForm = {
    member_ids: string[];
    session_id: string;
    role: string;
    joined_on: string;
    left_on: string;
    reason: string;
    paste: string;
};

type PreviewRow = {
    index: number;
    line_number: number | null;
    lookup: string | null;
    member_id: number | null;
    full_name: string | null;
    pno: string | null;
    member_code: string | null;
    current_status: string | null;
    role: string;
    joined_on: string | null;
    left_on: string | null;
    reason: string | null;
    status: 'ready' | 'warning' | 'blocked';
    messages: string[];
};

type PreviewResponse = {
    rows: PreviewRow[];
    summary: {
        ready: number;
        warning: number;
        blocked: number;
        total: number;
    };
};

interface Props {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    team: Team;
    sessions: Session[];
    selectedSessionId: number | null;
}

const MEMBER_ROLES = ['PLAYER', 'CAPTAIN', 'RESERVE'] as const;

export function BackfillMembersDialog({
    open,
    onOpenChange,
    team,
    sessions,
    selectedSessionId,
}: Props) {
    const { t } = useTranslation();
    const [pickedMember, setPickedMember] = useState<MemberOption | null>(null);
    const [selectedMembers, setSelectedMembers] = useState<MemberOption[]>([]);
    const [previewResult, setPreviewResult] = useState<PreviewResponse | null>(
        null,
    );
    const previewRequest = useHttp<BackfillForm, PreviewResponse>({
        member_ids: [],
        session_id: selectedSessionId ? String(selectedSessionId) : '',
        role: 'PLAYER',
        joined_on: '',
        left_on: '',
        reason: '',
        paste: '',
    });

    const { data, setData, post, processing, errors, reset } =
        useForm<BackfillForm>({
            member_ids: [],
            session_id: selectedSessionId ? String(selectedSessionId) : '',
            role: 'PLAYER',
            joined_on: '',
            left_on: '',
            reason: '',
            paste: '',
        });

    useEffect(() => {
        setData(
            'session_id',
            selectedSessionId ? String(selectedSessionId) : '',
        );
    }, [selectedSessionId, setData]);

    function handleMemberChange(member: MemberOption | null) {
        setPickedMember(member);

        if (!member || selectedMembers.some((item) => item.id === member.id)) {
            return;
        }

        const next = [...selectedMembers, member];
        setSelectedMembers(next);
        setData(
            'member_ids',
            next.map((item) => String(item.id)),
        );
        setPreviewResult(null);
        setPickedMember(null);
    }

    function removeSelectedMember(memberId: number) {
        const next = selectedMembers.filter((member) => member.id !== memberId);
        setSelectedMembers(next);
        setData(
            'member_ids',
            next.map((member) => String(member.id)),
        );
        setPreviewResult(null);
    }

    function updateField(
        key: Exclude<keyof BackfillForm, 'member_ids'>,
        value: string,
    ) {
        setData(key, value);
        setPreviewResult(null);
    }

    function handlePreview(event: React.FormEvent) {
        event.preventDefault();
        previewRequest.transform(() => data);
        void previewRequest.post(previewBackfill.url(team), {
            onSuccess: (response) => setPreviewResult(response),
            onError: () => setPreviewResult(null),
        });
    }

    function handleApply() {
        post(backfill.url(team), {
            preserveScroll: true,
            onSuccess: () => {
                router.reload({
                    only: [
                        'members',
                        'removedMembers',
                        'memberMovements',
                        'counts',
                    ],
                });
                handleOpenChange(false);
            },
        });
    }

    function handleOpenChange(value: boolean) {
        if (!value) {
            setPickedMember(null);
            setSelectedMembers([]);
            setPreviewResult(null);
            reset();
        }

        onOpenChange(value);
    }

    const extraFilters: Record<string, string> = {
        available_for_team_id: String(team.id),
        historical: '1',
    };

    if (data.session_id) {
        extraFilters.available_for_session_id = data.session_id;
    }

    const applicableRows =
        (previewResult?.summary.ready ?? 0) +
        (previewResult?.summary.warning ?? 0);

    return (
        <Dialog open={open} onOpenChange={handleOpenChange}>
            <DialogContent
                className="sm:max-w-4xl"
                aria-describedby={undefined}
            >
                <DialogHeader>
                    <DialogTitle>{t('Backfill old roster')}</DialogTitle>
                </DialogHeader>

                <form onSubmit={handlePreview} className="space-y-5">
                    <div className="grid gap-4 md:grid-cols-3">
                        <div className="grid gap-2">
                            <Label htmlFor="backfill-session">
                                {t('Session')}
                            </Label>
                            <Select
                                value={data.session_id}
                                onValueChange={(value) =>
                                    updateField('session_id', value)
                                }
                            >
                                <SelectTrigger
                                    id="backfill-session"
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
                            <Label htmlFor="backfill-role">{t('Role')}</Label>
                            <Select
                                value={data.role}
                                onValueChange={(value) =>
                                    updateField('role', value)
                                }
                            >
                                <SelectTrigger
                                    id="backfill-role"
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
                            <InputError message={errors.role} />
                        </div>

                        <div className="grid gap-2">
                            <Label htmlFor="backfill-joined">
                                {t('Joined on')}
                            </Label>
                            <Input
                                id="backfill-joined"
                                type="date"
                                value={data.joined_on}
                                onChange={(event) =>
                                    updateField('joined_on', event.target.value)
                                }
                            />
                            <InputError message={errors.joined_on} />
                        </div>

                        <div className="grid gap-2">
                            <Label htmlFor="backfill-left">
                                {t('Left on')}
                            </Label>
                            <Input
                                id="backfill-left"
                                type="date"
                                value={data.left_on}
                                onChange={(event) =>
                                    updateField('left_on', event.target.value)
                                }
                            />
                            <InputError message={errors.left_on} />
                        </div>

                        <div className="grid gap-2 md:col-span-2">
                            <Label htmlFor="backfill-reason">
                                {t('Removal reason')}
                            </Label>
                            <Input
                                id="backfill-reason"
                                value={data.reason}
                                onChange={(event) =>
                                    updateField('reason', event.target.value)
                                }
                            />
                            <InputError message={errors.reason} />
                        </div>
                    </div>

                    <div className="grid gap-4 md:grid-cols-2">
                        <div className="grid gap-2">
                            <Label htmlFor="backfill-member">
                                {t('Find athletes')}
                            </Label>
                            <MemberPicker
                                id="backfill-member"
                                value={pickedMember}
                                onChange={handleMemberChange}
                                placeholder={
                                    team.sport
                                        ? t('Search :sport athletes…').replace(
                                              ':sport',
                                              team.sport.name,
                                          )
                                        : t('Search athletes…')
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
                            {selectedMembers.length > 0 && (
                                <div className="flex flex-wrap gap-2">
                                    {selectedMembers.map((member) => (
                                        <span
                                            key={member.id}
                                            className="inline-flex items-center gap-1 rounded-md border bg-muted px-2 py-1 text-xs"
                                        >
                                            {member.full_name}
                                            {member.pno && (
                                                <span className="font-mono text-muted-foreground">
                                                    {member.pno}
                                                </span>
                                            )}
                                            <button
                                                type="button"
                                                onClick={() =>
                                                    removeSelectedMember(
                                                        member.id,
                                                    )
                                                }
                                                aria-label={t('Remove')}
                                            >
                                                <X className="h-3 w-3" />
                                            </button>
                                        </span>
                                    ))}
                                </div>
                            )}
                        </div>

                        <div className="grid gap-2">
                            <Label htmlFor="backfill-paste">
                                {t('Paste rows')}
                            </Label>
                            <Textarea
                                id="backfill-paste"
                                value={data.paste}
                                onChange={(event) =>
                                    updateField('paste', event.target.value)
                                }
                                placeholder={t(
                                    'PNO or member code, role, joined on, left on, reason',
                                )}
                                className="min-h-28"
                            />
                            <InputError message={errors.paste} />
                        </div>
                    </div>

                    {previewResult && (
                        <div className="space-y-3 rounded-xl border bg-background/70 p-3">
                            <div className="flex flex-wrap items-center gap-2">
                                <Badge variant="secondary">
                                    {t('Ready')}: {previewResult.summary.ready}
                                </Badge>
                                <Badge variant="outline">
                                    {t('Warnings')}:{' '}
                                    {previewResult.summary.warning}
                                </Badge>
                                <Badge variant="destructive">
                                    {t('Blocked')}:{' '}
                                    {previewResult.summary.blocked}
                                </Badge>
                            </div>

                            <div className="max-h-72 overflow-y-auto rounded-md border">
                                <Table>
                                    <TableHeader>
                                        <TableRow className="bg-muted/40">
                                            <TableHead>{t('Status')}</TableHead>
                                            <TableHead>{t('Name')}</TableHead>
                                            <TableHead>{t('PNO')}</TableHead>
                                            <TableHead>{t('Role')}</TableHead>
                                            <TableHead>
                                                {t('Joined on')}
                                            </TableHead>
                                            <TableHead>
                                                {t('Left on')}
                                            </TableHead>
                                            <TableHead>{t('Notes')}</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {previewResult.rows.map((row) => (
                                            <TableRow key={row.index}>
                                                <TableCell>
                                                    <div className="flex items-center gap-1.5">
                                                        {row.status ===
                                                            'ready' && (
                                                            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                                                        )}
                                                        {row.status ===
                                                            'warning' && (
                                                            <AlertTriangle className="h-4 w-4 text-amber-600" />
                                                        )}
                                                        {row.status ===
                                                            'blocked' && (
                                                            <CircleSlash className="h-4 w-4 text-destructive" />
                                                        )}
                                                        <span className="text-xs font-medium">
                                                            {t(row.status)}
                                                        </span>
                                                    </div>
                                                </TableCell>
                                                <TableCell className="font-medium">
                                                    {row.full_name ??
                                                        row.lookup ??
                                                        '—'}
                                                </TableCell>
                                                <TableCell className="font-mono text-xs">
                                                    {row.pno ??
                                                        row.member_code ??
                                                        '—'}
                                                </TableCell>
                                                <TableCell>
                                                    {t(row.role)}
                                                </TableCell>
                                                <TableCell>
                                                    {row.joined_on ?? '—'}
                                                </TableCell>
                                                <TableCell>
                                                    {row.left_on ?? '—'}
                                                </TableCell>
                                                <TableCell className="max-w-xs text-xs text-muted-foreground">
                                                    {row.messages.length > 0
                                                        ? row.messages.join(' ')
                                                        : '—'}
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </div>
                        </div>
                    )}

                    <DialogFooter>
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => handleOpenChange(false)}
                        >
                            {t('Cancel')}
                        </Button>
                        <Button
                            type="submit"
                            variant="secondary"
                            disabled={previewRequest.processing}
                        >
                            {t('Preview')}
                        </Button>
                        <Button
                            type="button"
                            disabled={
                                !previewResult ||
                                applicableRows === 0 ||
                                processing
                            }
                            onClick={handleApply}
                        >
                            {applicableRows > 0
                                ? t('Apply (:count)').replace(
                                      ':count',
                                      String(applicableRows),
                                  )
                                : t('Apply')}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
