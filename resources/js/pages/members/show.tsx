import {
    Deferred,
    Head,
    Link,
    router,
    setLayoutProps,
    useForm,
    useHttp,
    usePage,
} from '@inertiajs/react';
import { Camera, Download, Images, Plus, Printer } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { store as storeBenefit } from '@/actions/App/Http/Controllers/AchievementBenefitController';
import MemberAchievementsController from '@/actions/App/Http/Controllers/Api/V1/MemberAchievementsController';
import MemberParticipationsController from '@/actions/App/Http/Controllers/Api/V1/MemberParticipationsController';
import { show as showEvent } from '@/actions/App/Http/Controllers/EventController';
import {
    edit as editMember,
    index as membersIndex,
} from '@/actions/App/Http/Controllers/MemberController';
import { show as exportMember } from '@/actions/App/Http/Controllers/MemberExportController';
import {
    store as storeMemberPhoto,
    destroy as destroyMemberPhoto,
} from '@/actions/App/Http/Controllers/MemberPhotoController';
import { show as showTeam } from '@/actions/App/Http/Controllers/TeamController';
import { show as showTournament } from '@/actions/App/Http/Controllers/TournamentController';
import { DatePicker } from '@/components/date-picker';
import InputError from '@/components/input-error';
import { AliasInlineForm } from '@/components/members/alias-inline-form';
import { LegacyAchievementsTab } from '@/components/members/legacy-achievements-tab';
import { MemberMediaTab } from '@/components/members/member-media-tab';
import { ParticipationMediaSheet } from '@/components/members/participation-media-sheet';
import { StatusChangeModal } from '@/components/members/status-change-modal';
import { ChangeLog } from '@/components/shared/change-log';
import type { AuditEntry } from '@/components/shared/change-log';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
    Dialog,
    DialogContent,
    DialogFooter,
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

type Member = {
    id: number;
    member_code: string;
    pno: string | null;
    full_name_hi: string;
    full_name_en: string | null;
    father_name_hi: string | null;
    rank: string | null;
    gender: string;
    dob: string | null;
    joining_date: string | null;
    mobile: string | null;
    player_category: string;
    player_level: string;
    current_status: string;
    home_district: { id: number; name_hi: string } | null;
    posting_district: { id: number; name_hi: string } | null;
    current_unit: { id: number; name_hi: string } | null;
    photo_path: string | null;
    blood_group: string | null;
    caste: string | null;
    promotion_date: string | null;
    appointment: string | null;
    home_address: string | null;
    recruitment_type: string | null;
    sport: { id: number; name_hi: string; name_en: string } | null;
    playable_sports: { id: number; name_hi: string; name_en: string }[];
    sport_event: string | null;
    other_notes: string | null;
    team_since: string | null;
};

type StatusEntry = {
    id: number;
    status: string;
    effective_on: string;
    reason_hi: string | null;
    recorded_by_name: string | null;
};
type Alias = { id: number; alias_hi: string; source: string };
type MemberTeamRow = {
    id: number;
    role: string | null;
    joined_on: string | null;
    left_on: string | null;
    team: { id: number; name_hi: string } | null;
    sport: { id: number; name: string } | null;
    session: { id: number; name: string } | null;
};

type ParticipationEntry = {
    id: number;
    position: number | null;
    media_files_count: number;
    tournament: {
        id: number;
        name_hi: string;
        tier_code: string | null;
        date_from: string | null;
    };
    event: { id: number; name_hi: string; gender_class: string };
    achievement: {
        medal_type: string;
        position: number | null;
        remarks: string | null;
    } | null;
};

type ParticipationGroup = {
    session: { id: number; name: string };
    participations: ParticipationEntry[];
};

type AchievementBenefitRow = {
    id: number;
    benefit_type: string;
    promoted_from_rank: string | null;
    promoted_to_rank: string | null;
    cash_amount: string | null;
    benefit_date: string | null;
    order_reference: string | null;
    remarks: string | null;
};

type AchievementsData = {
    summary: { GOLD: number; SILVER: number; BRONZE: number; MERIT: number };
    achievements: Array<{
        id: number;
        medal_type: string;
        position: number | null;
        remarks: string | null;
        session: { id: number; name: string };
        tournament: { id: number; name_hi: string; tier_code: string | null };
        event: { id: number; name_hi: string };
        benefits: AchievementBenefitRow[];
    }>;
};

const MEDAL_VARIANT: Record<
    string,
    'default' | 'secondary' | 'outline' | 'destructive'
> = {
    GOLD: 'default',
    SILVER: 'secondary',
    BRONZE: 'outline',
    MERIT: 'outline',
};

const BENEFIT_TYPES = [
    'PROMOTION',
    'OUT_OF_TURN_PROMOTION',
    'CASH_AWARD',
    'COMMENDATION',
    'NONE',
    'OTHER',
] as const;

function AddAchievementBenefitDialog({
    achievementId,
    onSaved,
}: {
    achievementId: number;
    onSaved: () => void;
}) {
    const { t } = useTranslation();
    const [open, setOpen] = useState(false);
    const form = useForm({
        benefitable_type: 'achievement',
        benefitable_id: String(achievementId),
        benefit_type: '',
        promoted_from_rank: '',
        promoted_to_rank: '',
        cash_amount: '',
        benefit_date: '',
        order_reference: '',
        remarks: '',
    });

    function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        form.post(storeBenefit.url(), {
            onSuccess: () => {
                setOpen(false);
                form.reset();
                form.setData('benefitable_type', 'achievement');
                form.setData('benefitable_id', String(achievementId));
                onSaved();
            },
        });
    }

    const isPromotion =
        form.data.benefit_type === 'PROMOTION' ||
        form.data.benefit_type === 'OUT_OF_TURN_PROMOTION';
    const isCash = form.data.benefit_type === 'CASH_AWARD';

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant="ghost" size="sm" className="h-7 text-xs">
                    <Plus className="mr-1 size-3" />
                    {t('Add benefit')}
                </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md" aria-describedby={undefined}>
                <DialogHeader>
                    <DialogTitle>{t('Add benefit')}</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="mt-2 space-y-4">
                    <div className="grid gap-2">
                        <Label>
                            {t('Benefit type')}{' '}
                            <span className="text-destructive">*</span>
                        </Label>
                        <Select
                            value={form.data.benefit_type}
                            onValueChange={(v) =>
                                form.setData('benefit_type', v)
                            }
                        >
                            <SelectTrigger className="w-full">
                                <SelectValue
                                    placeholder={t('Select benefit type')}
                                />
                            </SelectTrigger>
                            <SelectContent>
                                {BENEFIT_TYPES.map((bt) => (
                                    <SelectItem key={bt} value={bt}>
                                        {t(bt)}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <InputError message={form.errors.benefit_type} />
                    </div>

                    {isPromotion && (
                        <div className="grid gap-5 sm:grid-cols-2">
                            <div className="grid gap-2">
                                <Label>{t('Promoted from rank')}</Label>
                                <Input
                                    value={form.data.promoted_from_rank}
                                    onChange={(e) =>
                                        form.setData(
                                            'promoted_from_rank',
                                            e.target.value,
                                        )
                                    }
                                    maxLength={100}
                                />
                                <InputError
                                    message={form.errors.promoted_from_rank}
                                />
                            </div>
                            <div className="grid gap-2">
                                <Label>{t('Promoted to rank')}</Label>
                                <Input
                                    value={form.data.promoted_to_rank}
                                    onChange={(e) =>
                                        form.setData(
                                            'promoted_to_rank',
                                            e.target.value,
                                        )
                                    }
                                    maxLength={100}
                                />
                                <InputError
                                    message={form.errors.promoted_to_rank}
                                />
                            </div>
                        </div>
                    )}

                    {isCash && (
                        <div className="grid gap-2">
                            <Label>{t('Cash amount')}</Label>
                            <Input
                                type="number"
                                step="0.01"
                                value={form.data.cash_amount}
                                onChange={(e) =>
                                    form.setData('cash_amount', e.target.value)
                                }
                            />
                            <InputError message={form.errors.cash_amount} />
                        </div>
                    )}

                    <div className="grid gap-5 sm:grid-cols-2">
                        <div className="grid gap-2">
                            <Label>{t('Benefit date')}</Label>
                            <DatePicker
                                value={form.data.benefit_date}
                                onChange={(v) =>
                                    form.setData('benefit_date', v)
                                }
                            />
                            <InputError message={form.errors.benefit_date} />
                        </div>
                        <div className="grid gap-2">
                            <Label>{t('Order reference')}</Label>
                            <Input
                                value={form.data.order_reference}
                                onChange={(e) =>
                                    form.setData(
                                        'order_reference',
                                        e.target.value,
                                    )
                                }
                                maxLength={255}
                            />
                            <InputError message={form.errors.order_reference} />
                        </div>
                    </div>

                    <div className="grid gap-2">
                        <Label>{t('Remarks')}</Label>
                        <Textarea
                            value={form.data.remarks}
                            onChange={(e) =>
                                form.setData('remarks', e.target.value)
                            }
                            rows={2}
                        />
                        <InputError message={form.errors.remarks} />
                    </div>

                    <div className="flex justify-end gap-2 pt-2">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => setOpen(false)}
                        >
                            {t('Cancel')}
                        </Button>
                        <Button type="submit" disabled={form.processing}>
                            {t('Save benefit')}
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
}

type LegacyAchievement = {
    id: number;
    period: string;
    level: string;
    competition_details: string;
    event_date: string | null;
    venue: string | null;
    sport_discipline: string | null;
    event: string | null;
    medal_type: string | null;
    sort_order: number | null;
    benefits: Array<{
        id: number;
        benefit_type: string;
        promoted_from_rank: string | null;
        promoted_to_rank: string | null;
        cash_amount: string | null;
        benefit_date: string | null;
        order_reference: string | null;
        remarks: string | null;
    }>;
};

const ALL_COLUMNS: { key: string; label: string }[] = [
    // { key: 'member_code', label: 'Member code' },
    { key: 'pno', label: 'PNO' },
    { key: 'full_name_hi', label: 'Name (Hindi)' },
    { key: 'full_name_en', label: 'Name (English)' },
    { key: 'father_name_hi', label: "Father's name" },
    { key: 'gender', label: 'Gender' },
    { key: 'dob', label: 'Date of birth' },
    { key: 'rank', label: 'Rank' },
    { key: 'mobile', label: 'Mobile' },
    { key: 'current_status', label: 'Status' },
    { key: 'player_category', label: 'Category' },
    { key: 'player_level', label: 'Level' },
    { key: 'unit', label: 'Unit' },
    { key: 'home_district', label: 'Home district' },
    { key: 'joining_date', label: 'Joining date' },
    { key: 'blood_group', label: 'Blood group' },
    { key: 'caste', label: 'Caste' },
    { key: 'appointment', label: 'Appointment' },
    { key: 'sport_event', label: 'Sport event' },
    { key: 'promotion_date', label: 'Promotion date' },
    { key: 'team_since', label: 'Team since' },
];

export default function MembersShow({
    member,
    statusHistory,
    aliases,
    memberTeams,
    legacyAchievements,
    auditLog,
}: {
    member: Member;
    statusHistory?: StatusEntry[];
    aliases?: Alias[];
    memberTeams?: MemberTeamRow[];
    legacyAchievements?: LegacyAchievement[];
    auditLog?: AuditEntry[];
}) {
    const [activeTab, setActiveTab] = useState('overview');
    const [participations, setParticipations] = useState<
        ParticipationGroup[] | null
    >(null);
    const [achievementsData, setAchievementsData] =
        useState<AchievementsData | null>(null);
    const { get: getParticipations, processing: loadingParticipations } =
        useHttp<Record<string, never>, { data: ParticipationGroup[] }>({});
    const { get: getAchievements, processing: loadingAchievements } = useHttp<
        Record<string, never>,
        { data: AchievementsData }
    >({});
    const participationsFetched = useRef(false);
    const achievementsFetched = useRef(false);
    const memberId = member.id;
    const permissions = usePage().props.auth.permissions;
    const canDeleteMedia = permissions.includes('media.delete');
    const canUploadMedia = permissions.includes('media.upload');
    const [mediaParticipationId, setMediaParticipationId] = useState<{
        id: number;
        eventName: string;
    } | null>(null);

    useEffect(() => {
        if (activeTab === 'participations' && !participationsFetched.current) {
            participationsFetched.current = true;
            getParticipations(MemberParticipationsController.url(memberId), {
                onSuccess: (res) => {
                    const r = res as unknown as { data: ParticipationGroup[] };
                    setParticipations(r?.data ?? []);
                },
                onError: () => setParticipations([]),
            });
        }

        if (activeTab === 'achievements' && !achievementsFetched.current) {
            achievementsFetched.current = true;
            getAchievements(MemberAchievementsController.url(memberId), {
                onSuccess: (res) => {
                    const r = res as unknown as { data: AchievementsData };
                    setAchievementsData(
                        r?.data ?? {
                            summary: {
                                GOLD: 0,
                                SILVER: 0,
                                BRONZE: 0,
                                MERIT: 0,
                            },
                            achievements: [],
                        },
                    );
                },
                onError: () =>
                    setAchievementsData({
                        summary: { GOLD: 0, SILVER: 0, BRONZE: 0, MERIT: 0 },
                        achievements: [],
                    }),
            });
        }
    }, [activeTab, memberId, getParticipations, getAchievements]);
    const [mediaKey] = useState(0);

    function refetchAchievements() {
        achievementsFetched.current = false;
        getAchievements(MemberAchievementsController.url(memberId), {
            onSuccess: (res) => {
                const r = res as unknown as { data: AchievementsData };
                setAchievementsData(
                    r?.data ?? {
                        summary: { GOLD: 0, SILVER: 0, BRONZE: 0, MERIT: 0 },
                        achievements: [],
                    },
                );
            },
            onError: () =>
                setAchievementsData({
                    summary: { GOLD: 0, SILVER: 0, BRONZE: 0, MERIT: 0 },
                    achievements: [],
                }),
        });
    }
    const { t } = useTranslation();
    const { locale } = usePage().props;

    setLayoutProps({
        breadcrumbs: [
            { title: t('Members'), href: membersIndex.url() },
            { title: member.full_name_hi },
        ],
    });

    const [statusOpen, setStatusOpen] = useState(false);
    const [exportOpen, setExportOpen] = useState(false);
    const [selectedColumns, setSelectedColumns] = useState<string[]>(
        ALL_COLUMNS.map((c) => c.key),
    );

    function handlePrint(): void {
        const cols = ALL_COLUMNS.filter((c) => selectedColumns.includes(c.key));
        const getValue = (key: string): string => {
            switch (key) {
                case 'member_code':
                    return member.member_code ?? '';
                case 'pno':
                    return member.pno ?? '';
                case 'full_name_hi':
                    return member.full_name_hi ?? '';
                case 'full_name_en':
                    return member.full_name_en ?? '';
                case 'father_name_hi':
                    return member.father_name_hi ?? '';
                case 'gender':
                    return member.gender === 'M'
                        ? t('Male')
                        : member.gender === 'F'
                          ? t('Female')
                          : t('Other gender');
                case 'dob':
                    return member.dob ?? '';
                case 'rank':
                    return member.rank ?? '';
                case 'mobile':
                    return member.mobile ?? '';
                case 'current_status':
                    return t(member.current_status);
                case 'player_category':
                    return member.player_category ?? '';
                case 'player_level':
                    return member.player_level ?? '';
                case 'unit':
                    return member.current_unit?.name_hi ?? '';
                case 'home_district':
                    return member.home_district?.name_hi ?? '';
                case 'joining_date':
                    return member.joining_date ?? '';
                case 'blood_group':
                    return member.blood_group ?? '';
                case 'caste':
                    return member.caste ?? '';
                case 'appointment':
                    return member.appointment ?? '';
                case 'sport_event':
                    return member.sport_event ?? '';
                case 'promotion_date':
                    return member.promotion_date ?? '';
                case 'team_since':
                    return member.team_since ?? '';
                default:
                    return '';
            }
        };
        const headers = cols
            .map(
                (c) =>
                    `<th style="border:1px solid #ccc;padding:6px 10px;background:#f5f5f5;text-align:left">${t(c.label)}</th>`,
            )
            .join('');
        const cells = cols
            .map(
                (c) =>
                    `<td style="border:1px solid #ccc;padding:6px 10px">${getValue(c.key)}</td>`,
            )
            .join('');
        const html = `<!doctype html><html><head><meta charset="utf-8"><title>${member.full_name_hi}</title><style>body{font-family:sans-serif;padding:20px}table{border-collapse:collapse;width:100%}@media print{@page{size:landscape}}</style></head><body><h2 style="margin-bottom:12px">${member.full_name_hi}</h2><table><thead><tr>${headers}</tr></thead><tbody><tr>${cells}</tr></tbody></table></body></html>`;
        const win = window.open('', '_blank', 'width=900,height=600');

        if (!win) {
            return;
        }

        win.document.write(html);
        win.document.close();
        win.onload = () => {
            win.print();
            win.close();
        };
    }

    function buildExportUrl(): string {
        const params = new URLSearchParams();

        for (const col of selectedColumns) {
            params.append('columns[]', col);
        }

        return exportMember.url(member) + '?' + params.toString();
    }

    const detail = (label: string, value: React.ReactNode) => (
        <div className="grid gap-1">
            <dt className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                {label}
            </dt>
            <dd className="text-sm">
                {value ?? <span className="text-muted-foreground">—</span>}
            </dd>
        </div>
    );

    return (
        <>
            <Head title={member.full_name_hi} />

            <div className="space-y-6">
                <div className="flex items-start gap-4">
                    <div className="flex min-w-0 items-start gap-4">
                        {/* Photo */}
                        <div className="shrink-0">
                            {member.photo_path ? (
                                <div className="group relative size-20 overflow-hidden rounded-xl border bg-muted">
                                    <img
                                        src={`/storage/${member.photo_path}`}
                                        alt={member.full_name_hi}
                                        className="size-full object-cover"
                                    />
                                    <button
                                        className="absolute inset-0 flex items-center justify-center bg-black/50 text-xs text-white opacity-0 transition-opacity group-hover:opacity-100"
                                        onClick={() =>
                                            router.delete(
                                                destroyMemberPhoto.url(member),
                                            )
                                        }
                                    >
                                        {t('Remove photo')}
                                    </button>
                                </div>
                            ) : (
                                <label className="flex size-20 cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed bg-muted transition-colors hover:bg-muted/80">
                                    <span className="px-1 text-center text-xs leading-tight text-muted-foreground">
                                        {t('Upload photo')}
                                    </span>
                                    <input
                                        type="file"
                                        accept="image/jpeg,image/png,image/webp"
                                        className="sr-only"
                                        onChange={(e) => {
                                            const file = e.target.files?.[0];

                                            if (!file) {
                                                return;
                                            }

                                            const fd = new FormData();
                                            fd.append('photo', file);
                                            router.post(
                                                storeMemberPhoto.url(member),
                                                fd,
                                            );
                                        }}
                                    />
                                </label>
                            )}
                        </div>

                        <div className="min-w-0">
                            <h1 className="text-2xl font-bold">
                                {member.full_name_hi}
                            </h1>
                            {member.full_name_en && (
                                <p className="text-muted-foreground">
                                    {member.full_name_en}
                                </p>
                            )}
                            <div className="mt-2 flex flex-wrap items-center gap-2">
                                {member.pno && (
                                    <span className="font-mono text-sm text-muted-foreground">
                                        {member.pno}
                                    </span>
                                )}
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setExportOpen(true)}
                                >
                                    <Download className="mr-1.5 h-4 w-4" />
                                    {t('Export')}
                                </Button>
                                <Button variant="outline" size="sm" asChild>
                                    <Link href={editMember.url(member)}>
                                        {t('Edit')}
                                    </Link>
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>

                <Tabs defaultValue="overview" onValueChange={setActiveTab}>
                    <TabsList>
                        <TabsTrigger value="overview">
                            {t('Overview')}
                        </TabsTrigger>
                        <TabsTrigger value="status">
                            {t('Status history')}
                        </TabsTrigger>
                        <TabsTrigger value="teams">{t('Teams')}</TabsTrigger>
                        <TabsTrigger value="participations">
                            {t('Participations')}
                        </TabsTrigger>
                        <TabsTrigger value="achievements">
                            {t('Achievements')}
                        </TabsTrigger>
                        <TabsTrigger value="legacy">
                            {t('Legacy achievements')}
                        </TabsTrigger>
                        <TabsTrigger value="promotions">
                            {t('Promotions')}
                        </TabsTrigger>
                        <TabsTrigger value="changelog">
                            {t('Change log')}
                        </TabsTrigger>
                        <TabsTrigger value="media">{t('Media')}</TabsTrigger>
                    </TabsList>

                    {/* Overview */}
                    <TabsContent value="overview">
                        <div className="rounded-xl border bg-card p-6">
                            <dl className="grid grid-cols-2 gap-x-8 gap-y-5 sm:grid-cols-3">
                                {detail(
                                    t('PNO'),
                                    <span className="font-mono">
                                        {member.pno}
                                    </span>,
                                )}
                                {detail(
                                    t('Current status'),
                                    <Badge variant="outline">
                                        {t(member.current_status)}
                                    </Badge>,
                                )}
                                {detail(t('Name (Hindi)'), member.full_name_hi)}
                                {detail(
                                    t('Name (English)'),
                                    member.full_name_en,
                                )}
                                {detail(
                                    t("Father's name"),
                                    member.father_name_hi,
                                )}
                                {detail(
                                    t('Gender'),
                                    t(
                                        member.gender === 'M'
                                            ? 'Male'
                                            : member.gender === 'F'
                                              ? 'Female'
                                              : 'Other gender',
                                    ),
                                )}
                                {detail(t('Date of birth'), member.dob)}
                                {detail(t('Mobile'), member.mobile)}
                                {detail(t('Rank'), member.rank)}
                                {detail(t('Joining date'), member.joining_date)}
                                {detail(
                                    t('Home district'),
                                    member.home_district?.name_hi,
                                )}
                                {detail(
                                    t('Posting district'),
                                    member.posting_district?.name_hi,
                                )}
                                {detail(t('Category'), member.player_category)}
                                {detail(t('Level'), member.player_level)}
                                {member.blood_group &&
                                    detail(
                                        t('Blood group'),
                                        member.blood_group,
                                    )}
                                {member.caste &&
                                    detail(t('Caste'), member.caste)}
                                {member.sport &&
                                    detail(
                                        t('Primary sport'),
                                        locale === 'en'
                                            ? member.sport.name_en
                                            : member.sport.name_hi,
                                    )}
                                {member.playable_sports.length > 0 &&
                                    detail(
                                        t('Other playable sports'),
                                        member.playable_sports
                                            .map((sport) =>
                                                locale === 'en'
                                                    ? sport.name_en
                                                    : sport.name_hi,
                                            )
                                            .join(', '),
                                    )}
                                {member.appointment &&
                                    detail(
                                        t('Appointment'),
                                        member.appointment,
                                    )}
                                {member.sport_event &&
                                    detail(
                                        t('Sport event'),
                                        member.sport_event,
                                    )}
                                {member.promotion_date &&
                                    detail(
                                        t('Promotion date'),
                                        member.promotion_date,
                                    )}
                                {member.team_since &&
                                    detail(t('Team since'), member.team_since)}
                                {member.home_address &&
                                    detail(
                                        t('Home address'),
                                        member.home_address,
                                    )}
                                {member.other_notes &&
                                    detail(
                                        t('Other notes'),
                                        member.other_notes,
                                    )}
                            </dl>
                        </div>
                    </TabsContent>

                    {/* Status history */}
                    <TabsContent value="status">
                        <div className="space-y-4 rounded-xl border bg-card p-6">
                            <div className="flex items-center justify-between">
                                <h3 className="text-sm font-medium">
                                    {t('Status history')}
                                </h3>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setStatusOpen(true)}
                                >
                                    {t('Change status')}
                                </Button>
                                <StatusChangeModal
                                    member={member}
                                    open={statusOpen}
                                    onOpenChange={setStatusOpen}
                                />
                            </div>
                            <Deferred
                                data="statusHistory"
                                fallback={
                                    <div className="space-y-2">
                                        {[1, 2, 3].map((n) => (
                                            <Skeleton
                                                key={n}
                                                className="h-10 w-full"
                                            />
                                        ))}
                                    </div>
                                }
                            >
                                <div className="divide-y">
                                    {(statusHistory ?? []).length === 0 ? (
                                        <p className="py-4 text-sm text-muted-foreground">
                                            {t('No status records.')}
                                        </p>
                                    ) : (
                                        (statusHistory ?? []).map((row) => (
                                            <div
                                                key={row.id}
                                                className="flex items-center justify-between py-3 text-sm"
                                            >
                                                <div className="space-y-0.5">
                                                    <Badge variant="outline">
                                                        {t(row.status)}
                                                    </Badge>
                                                    {row.reason_hi && (
                                                        <p className="text-xs text-muted-foreground">
                                                            {row.reason_hi}
                                                        </p>
                                                    )}
                                                </div>
                                                <div className="text-right text-xs text-muted-foreground">
                                                    <p>{row.effective_on}</p>
                                                    {row.recorded_by_name && (
                                                        <p>
                                                            {
                                                                row.recorded_by_name
                                                            }
                                                        </p>
                                                    )}
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </Deferred>
                        </div>
                    </TabsContent>

                    {/* Aliases */}
                    <TabsContent value="aliases">
                        <div className="rounded-xl border bg-card p-6">
                            <Deferred
                                data="aliases"
                                fallback={
                                    <div className="space-y-2">
                                        {[1, 2, 3].map((n) => (
                                            <Skeleton
                                                key={n}
                                                className="h-8 w-full"
                                            />
                                        ))}
                                    </div>
                                }
                            >
                                <AliasInlineForm
                                    member={member}
                                    aliases={aliases}
                                />
                            </Deferred>
                        </div>
                    </TabsContent>

                    {/* Teams */}
                    <TabsContent value="teams">
                        <div className="rounded-xl border bg-card">
                            <Deferred
                                data="memberTeams"
                                fallback={
                                    <div className="space-y-2 p-4">
                                        {[1, 2, 3].map((n) => (
                                            <Skeleton
                                                key={n}
                                                className="h-10 w-full"
                                            />
                                        ))}
                                    </div>
                                }
                            >
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>{t('Team')}</TableHead>
                                            <TableHead>{t('Sport')}</TableHead>
                                            <TableHead>
                                                {t('Session')}
                                            </TableHead>
                                            <TableHead>{t('Role')}</TableHead>
                                            <TableHead>{t('Joined')}</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {(memberTeams ?? []).length === 0 ? (
                                            <TableRow>
                                                <TableCell
                                                    colSpan={5}
                                                    className="text-center text-muted-foreground"
                                                >
                                                    {t('No team memberships.')}
                                                </TableCell>
                                            </TableRow>
                                        ) : (
                                            (memberTeams ?? []).map((row) => (
                                                <TableRow key={row.id}>
                                                    <TableCell className="font-medium">
                                                        {row.team ? (
                                                            <Link
                                                                href={showTeam.url(
                                                                    row.team,
                                                                )}
                                                                className="hover:underline"
                                                            >
                                                                {
                                                                    row.team
                                                                        .name_hi
                                                                }
                                                            </Link>
                                                        ) : (
                                                            '—'
                                                        )}
                                                    </TableCell>
                                                    <TableCell>
                                                        {row.sport?.name ?? '—'}
                                                    </TableCell>
                                                    <TableCell>
                                                        {row.session?.name ??
                                                            '—'}
                                                    </TableCell>
                                                    <TableCell>
                                                        {row.role
                                                            ? t(row.role)
                                                            : '—'}
                                                    </TableCell>
                                                    <TableCell>
                                                        {row.joined_on ?? '—'}
                                                    </TableCell>
                                                </TableRow>
                                            ))
                                        )}
                                    </TableBody>
                                </Table>
                            </Deferred>
                        </div>
                    </TabsContent>

                    {/* Participations */}
                    <TabsContent value="participations">
                        <div className="space-y-4">
                            {loadingParticipations ||
                            participations === null ? (
                                <div className="space-y-2">
                                    {[1, 2, 3].map((n) => (
                                        <Skeleton
                                            key={n}
                                            className="h-10 w-full"
                                        />
                                    ))}
                                </div>
                            ) : participations.length === 0 ? (
                                <div className="rounded-xl border bg-card p-6">
                                    <p className="text-sm text-muted-foreground">
                                        {t('No participations.')}
                                    </p>
                                </div>
                            ) : (
                                participations.map((group) => (
                                    <div
                                        key={group.session.id}
                                        className="rounded-xl border bg-card"
                                    >
                                        <div className="border-b px-4 py-2">
                                            <span className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                                                {group.session.name}
                                            </span>
                                        </div>
                                        <Table>
                                            <TableHeader>
                                                <TableRow>
                                                    <TableHead>
                                                        {t('Tournament')}
                                                    </TableHead>
                                                    <TableHead>
                                                        {t('Tier')}
                                                    </TableHead>
                                                    <TableHead>
                                                        {t('Event')}
                                                    </TableHead>
                                                    <TableHead>
                                                        {t('Medal')}
                                                    </TableHead>
                                                    <TableHead>
                                                        {t('Position')}
                                                    </TableHead>
                                                    <TableHead className="w-8" />
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {group.participations.map(
                                                    (p) => (
                                                        <TableRow key={p.id}>
                                                            <TableCell className="font-medium">
                                                                <Link
                                                                    href={showTournament.url(
                                                                        p
                                                                            .tournament
                                                                            .id,
                                                                    )}
                                                                    className="hover:underline"
                                                                >
                                                                    {
                                                                        p
                                                                            .tournament
                                                                            .name_hi
                                                                    }
                                                                </Link>
                                                            </TableCell>
                                                            <TableCell>
                                                                {p.tournament
                                                                    .tier_code ? (
                                                                    <Badge variant="outline">
                                                                        {
                                                                            p
                                                                                .tournament
                                                                                .tier_code
                                                                        }
                                                                    </Badge>
                                                                ) : (
                                                                    '—'
                                                                )}
                                                            </TableCell>
                                                            <TableCell>
                                                                <Link
                                                                    href={showEvent.url(
                                                                        {
                                                                            tournament:
                                                                                p
                                                                                    .tournament
                                                                                    .id,
                                                                            event: p
                                                                                .event
                                                                                .id,
                                                                        },
                                                                    )}
                                                                    className="hover:underline"
                                                                >
                                                                    {
                                                                        p.event
                                                                            .name_hi
                                                                    }
                                                                </Link>
                                                            </TableCell>
                                                            <TableCell>
                                                                {p.achievement
                                                                    ?.medal_type ? (
                                                                    <Badge
                                                                        variant={
                                                                            MEDAL_VARIANT[
                                                                                p
                                                                                    .achievement
                                                                                    .medal_type
                                                                            ] ??
                                                                            'outline'
                                                                        }
                                                                    >
                                                                        {t(
                                                                            p
                                                                                .achievement
                                                                                .medal_type,
                                                                        )}
                                                                    </Badge>
                                                                ) : (
                                                                    '—'
                                                                )}
                                                            </TableCell>
                                                            <TableCell>
                                                                {p.achievement
                                                                    ?.position ??
                                                                    p.position ??
                                                                    '—'}
                                                            </TableCell>
                                                            <TableCell className="text-right">
                                                                <Button
                                                                    variant="ghost"
                                                                    size="icon"
                                                                    className="relative h-7 w-7 text-muted-foreground hover:text-foreground"
                                                                    title={t(
                                                                        'Photos',
                                                                    )}
                                                                    onClick={() =>
                                                                        setMediaParticipationId(
                                                                            {
                                                                                id: p.id,
                                                                                eventName:
                                                                                    p
                                                                                        .event
                                                                                        ?.name_hi ??
                                                                                    '',
                                                                            },
                                                                        )
                                                                    }
                                                                >
                                                                    {canUploadMedia ||
                                                                    canDeleteMedia ? (
                                                                        <Camera className="h-3.5 w-3.5" />
                                                                    ) : (
                                                                        <Images className="h-3.5 w-3.5" />
                                                                    )}
                                                                    {p.media_files_count >
                                                                        0 && (
                                                                        <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[9px] font-medium text-primary-foreground">
                                                                            {p.media_files_count >
                                                                            9
                                                                                ? '9+'
                                                                                : p.media_files_count}
                                                                        </span>
                                                                    )}
                                                                    <span className="sr-only">
                                                                        {t(
                                                                            'Photos',
                                                                        )}
                                                                    </span>
                                                                </Button>
                                                            </TableCell>
                                                        </TableRow>
                                                    ),
                                                )}
                                            </TableBody>
                                        </Table>
                                    </div>
                                ))
                            )}
                        </div>
                    </TabsContent>

                    {/* Achievements */}
                    <TabsContent value="achievements">
                        <div className="space-y-4">
                            {loadingAchievements ||
                            achievementsData === null ? (
                                <div className="space-y-2">
                                    {[1, 2, 3].map((n) => (
                                        <Skeleton
                                            key={n}
                                            className="h-10 w-full"
                                        />
                                    ))}
                                </div>
                            ) : (
                                <>
                                    <div className="flex flex-wrap gap-3">
                                        {(
                                            [
                                                'GOLD',
                                                'SILVER',
                                                'BRONZE',
                                                'MERIT',
                                            ] as const
                                        ).map((m) => (
                                            <div
                                                key={m}
                                                className="flex items-center gap-2 rounded-lg border bg-card px-4 py-3"
                                            >
                                                <Badge
                                                    variant={MEDAL_VARIANT[m]}
                                                >
                                                    {t(m)}
                                                </Badge>
                                                <span className="text-xl font-bold">
                                                    {
                                                        achievementsData
                                                            .summary[m]
                                                    }
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                    {achievementsData.achievements.length ===
                                    0 ? (
                                        <div className="rounded-xl border bg-card p-6">
                                            <p className="text-sm text-muted-foreground">
                                                {t('No achievements.')}
                                            </p>
                                        </div>
                                    ) : (
                                        <div className="rounded-xl border bg-card">
                                            <Table>
                                                <TableHeader>
                                                    <TableRow>
                                                        <TableHead>
                                                            {t('Medal')}
                                                        </TableHead>
                                                        <TableHead>
                                                            {t('Tournament')}
                                                        </TableHead>
                                                        <TableHead>
                                                            {t('Tier')}
                                                        </TableHead>
                                                        <TableHead>
                                                            {t('Event')}
                                                        </TableHead>
                                                        <TableHead>
                                                            {t('Session')}
                                                        </TableHead>
                                                        <TableHead>
                                                            {t('Benefits')}
                                                        </TableHead>
                                                    </TableRow>
                                                </TableHeader>
                                                <TableBody>
                                                    {achievementsData.achievements.map(
                                                        (a) => (
                                                            <TableRow
                                                                key={a.id}
                                                            >
                                                                <TableCell>
                                                                    <Badge
                                                                        variant={
                                                                            MEDAL_VARIANT[
                                                                                a
                                                                                    .medal_type
                                                                            ] ??
                                                                            'outline'
                                                                        }
                                                                    >
                                                                        {t(
                                                                            a.medal_type,
                                                                        )}
                                                                    </Badge>
                                                                </TableCell>
                                                                <TableCell className="font-medium">
                                                                    <Link
                                                                        href={showTournament.url(
                                                                            a
                                                                                .tournament
                                                                                .id,
                                                                        )}
                                                                        className="hover:underline"
                                                                    >
                                                                        {
                                                                            a
                                                                                .tournament
                                                                                .name_hi
                                                                        }
                                                                    </Link>
                                                                </TableCell>
                                                                <TableCell>
                                                                    {a
                                                                        .tournament
                                                                        .tier_code ? (
                                                                        <Badge variant="outline">
                                                                            {
                                                                                a
                                                                                    .tournament
                                                                                    .tier_code
                                                                            }
                                                                        </Badge>
                                                                    ) : (
                                                                        '—'
                                                                    )}
                                                                </TableCell>
                                                                <TableCell>
                                                                    <Link
                                                                        href={showEvent.url(
                                                                            {
                                                                                tournament:
                                                                                    a
                                                                                        .tournament
                                                                                        .id,
                                                                                event: a
                                                                                    .event
                                                                                    .id,
                                                                            },
                                                                        )}
                                                                        className="hover:underline"
                                                                    >
                                                                        {
                                                                            a
                                                                                .event
                                                                                .name_hi
                                                                        }
                                                                    </Link>
                                                                </TableCell>
                                                                <TableCell>
                                                                    {
                                                                        a
                                                                            .session
                                                                            .name
                                                                    }
                                                                </TableCell>
                                                                <TableCell>
                                                                    {a.benefits
                                                                        .length ===
                                                                    0 ? (
                                                                        <div className="flex items-center gap-2">
                                                                            <Badge
                                                                                variant="outline"
                                                                                className="border-amber-400 bg-amber-50 text-amber-600"
                                                                            >
                                                                                ⚠{' '}
                                                                                {t(
                                                                                    'Benefit pending',
                                                                                )}
                                                                            </Badge>
                                                                            <AddAchievementBenefitDialog
                                                                                achievementId={
                                                                                    a.id
                                                                                }
                                                                                onSaved={
                                                                                    refetchAchievements
                                                                                }
                                                                            />
                                                                        </div>
                                                                    ) : (
                                                                        <div className="flex flex-wrap items-center gap-1">
                                                                            {a.benefits.map(
                                                                                (
                                                                                    b,
                                                                                ) => (
                                                                                    <Badge
                                                                                        key={
                                                                                            b.id
                                                                                        }
                                                                                        variant="secondary"
                                                                                        className="text-xs"
                                                                                    >
                                                                                        {t(
                                                                                            b.benefit_type,
                                                                                        )}
                                                                                        {b.cash_amount
                                                                                            ? ` ₹${b.cash_amount}`
                                                                                            : ''}
                                                                                    </Badge>
                                                                                ),
                                                                            )}
                                                                            <AddAchievementBenefitDialog
                                                                                achievementId={
                                                                                    a.id
                                                                                }
                                                                                onSaved={
                                                                                    refetchAchievements
                                                                                }
                                                                            />
                                                                        </div>
                                                                    )}
                                                                </TableCell>
                                                            </TableRow>
                                                        ),
                                                    )}
                                                </TableBody>
                                            </Table>
                                        </div>
                                    )}
                                </>
                            )}
                        </div>
                    </TabsContent>
                    {/* Legacy achievements */}
                    <TabsContent value="legacy">
                        <Deferred
                            data="legacyAchievements"
                            fallback={
                                <div className="space-y-2">
                                    {[1, 2, 3].map((n) => (
                                        <Skeleton
                                            key={n}
                                            className="h-12 w-full"
                                        />
                                    ))}
                                </div>
                            }
                        >
                            <LegacyAchievementsTab
                                member={member}
                                legacyAchievements={legacyAchievements}
                            />
                        </Deferred>
                    </TabsContent>
                    {/* Promotions */}
                    <TabsContent value="promotions">
                        Promotions content goes here.
                    </TabsContent>
                    {/* Change log */}
                    <TabsContent value="changelog">
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
                                primaryEntity="Member"
                                storageKey="member-changelog-view"
                            />
                        </Deferred>
                    </TabsContent>

                    {/* Media tab */}
                    <TabsContent value="media">
                        {activeTab === 'media' && (
                            <MemberMediaTab
                                key={mediaKey}
                                memberId={memberId}
                                canDelete={canDeleteMedia}
                            />
                        )}
                    </TabsContent>
                </Tabs>
            </div>

            {mediaParticipationId !== null && (
                <ParticipationMediaSheet
                    participationId={mediaParticipationId.id}
                    memberName={member.full_name_hi}
                    open={mediaParticipationId !== null}
                    onOpenChange={(o) => {
                        if (!o) {
                            setMediaParticipationId(null);
                        }
                    }}
                    canUpload={canUploadMedia}
                    canDelete={canDeleteMedia}
                />
            )}

            {/* Export column picker dialog */}
            <Dialog open={exportOpen} onOpenChange={setExportOpen}>
                <DialogContent
                    className="max-w-lg"
                    aria-describedby={undefined}
                >
                    <DialogHeader>
                        <DialogTitle>{t('Export member')}</DialogTitle>
                    </DialogHeader>

                    <div className="min-h-0 flex-1 space-y-3 overflow-y-auto pr-1">
                        <p className="text-sm text-muted-foreground">
                            {member.full_name_hi}
                        </p>

                        <div className="space-y-2">
                            <div className="flex items-center justify-between">
                                <Label className="text-sm font-medium">
                                    {t('Select columns to export')}
                                </Label>
                                <div className="flex gap-3">
                                    <button
                                        type="button"
                                        className="text-xs text-primary hover:underline"
                                        onClick={() =>
                                            setSelectedColumns(
                                                ALL_COLUMNS.map((c) => c.key),
                                            )
                                        }
                                    >
                                        {t('Select all')}
                                    </button>
                                    <button
                                        type="button"
                                        className="text-xs text-muted-foreground hover:underline"
                                        onClick={() => setSelectedColumns([])}
                                    >
                                        {t('Clear')}
                                    </button>
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-2 rounded-md border p-3">
                                {ALL_COLUMNS.map((col) => (
                                    <label
                                        key={col.key}
                                        className="flex cursor-pointer items-center gap-2 text-sm"
                                    >
                                        <Checkbox
                                            checked={selectedColumns.includes(
                                                col.key,
                                            )}
                                            onCheckedChange={(checked) => {
                                                setSelectedColumns((prev) =>
                                                    checked
                                                        ? [...prev, col.key]
                                                        : prev.filter(
                                                              (k) =>
                                                                  k !== col.key,
                                                          ),
                                                );
                                            }}
                                        />
                                        {t(col.label)}
                                    </label>
                                ))}
                            </div>
                        </div>
                    </div>

                    <DialogFooter>
                        <Button
                            variant="outline"
                            onClick={() => setExportOpen(false)}
                        >
                            {t('Cancel')}
                        </Button>
                        <Button
                            variant="outline"
                            disabled={selectedColumns.length === 0}
                            onClick={() => {
                                handlePrint();
                                setExportOpen(false);
                            }}
                        >
                            <Printer className="mr-1.5 h-4 w-4" />
                            {t('Print')}
                        </Button>
                        <Button
                            disabled={selectedColumns.length === 0}
                            onClick={() => {
                                window.location.href = buildExportUrl();
                                setExportOpen(false);
                            }}
                        >
                            <Download className="mr-1.5 h-4 w-4" />
                            {t('Download Excel')}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}
