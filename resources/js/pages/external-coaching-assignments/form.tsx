import { Link, useForm } from '@inertiajs/react';
import { format, isValid, parse } from 'date-fns';
import {
    ArrowLeft,
    CalendarCheck,
    Clock,
    Download,
    FileCheck2,
    Upload,
    X,
} from 'lucide-react';
import { useState } from 'react';

import type {
    store,
    update,
} from '@/actions/App/Http/Controllers/ExternalCoachingAssignmentController';
import { index } from '@/actions/App/Http/Controllers/ExternalCoachingAssignmentController';
import { Combobox } from '@/components/combobox';
import type { ComboboxItem } from '@/components/combobox';
import { DatePicker } from '@/components/date-picker';
import Heading from '@/components/heading';
import InputError from '@/components/input-error';
import { MemberPicker } from '@/components/member-picker';
import type { MemberOption } from '@/components/member-picker';
import { ConfidentialDocumentPreview } from '@/components/shared/confidential-document-preview';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useTranslation } from '@/hooks/use-translation';
import { cn } from '@/lib/utils';

type Option = { id: number; name: string };
type CoachOption = {
    id: number;
    name: string;
    email: string | null;
    phone: string | null;
};

export type Assignment = {
    id: number;
    member_id: number;
    external_coach_id: number;
    training_venue_id: number;
    sport_id: number;
    start_date: string;
    end_date: string;
    training_days: string[] | null;
    training_start_time: string | null;
    training_end_time: string | null;
    attendance_mode: string;
    permission_reference_number: string | null;
    status: string;
    cancellation_reason: string | null;
    completion_remarks: string | null;
    remarks: string | null;
    member?: MemberOption | null;
    permission_document?: {
        name: string | null;
        original_name: string | null;
        mime_type: string | null;
        size_bytes: number | null;
        preview_url: string;
        download_url: string;
    } | null;
    has_attendances?: boolean;
};

type Props = {
    title: string;
    description: string;
    action: ReturnType<typeof store> | ReturnType<typeof update>;
    externalCoaches: CoachOption[];
    trainingVenues: Option[];
    sports: Option[];
    statuses: string[];
    attendanceModes: string[];
    assignment?: Assignment;
};

type AssignmentFormData = {
    member_id: string;
    external_coach_id: string;
    training_venue_id: string;
    sport_id: string;
    start_date: string;
    end_date: string;
    training_days: string[];
    training_start_time: string;
    training_end_time: string;
    attendance_mode: string;
    permission_reference_number: string;
    permission_document: File | null;
    status: string;
    cancellation_reason: string;
    completion_remarks: string;
    remarks: string;
};

const DAYS = [
    'monday',
    'tuesday',
    'wednesday',
    'thursday',
    'friday',
    'saturday',
    'sunday',
];

function fileSizeLabel(value: number | null): string | null {
    if (!value) {
        return null;
    }

    if (value < 1024 * 1024) {
        return `${Math.max(1, Math.round(value / 1024))} KB`;
    }

    return `${(value / 1024 / 1024).toFixed(1)} MB`;
}

function fieldError(
    errors: Partial<Record<keyof AssignmentFormData | string, string>>,
    field: string,
): string | undefined {
    return errors[field];
}

function parsedYmd(value: string): string | null {
    const trimmed = value.trim();

    const datetimeMatch = trimmed.match(
        /^(\d{4})-(\d{1,2})-(\d{1,2})(?:[T\s].+)?$/,
    );

    if (datetimeMatch !== null) {
        const candidate = `${datetimeMatch[1]}-${datetimeMatch[2].padStart(2, '0')}-${datetimeMatch[3].padStart(2, '0')}`;
        const parsed = parse(candidate, 'yyyy-MM-dd', new Date());

        if (isValid(parsed)) {
            return format(parsed, 'yyyy-MM-dd');
        }
    }

    const slashedMatch = trimmed.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);

    if (slashedMatch !== null) {
        const candidate = `${slashedMatch[3]}-${slashedMatch[2].padStart(2, '0')}-${slashedMatch[1].padStart(2, '0')}`;
        const parsed = parse(candidate, 'yyyy-MM-dd', new Date());

        if (isValid(parsed)) {
            return format(parsed, 'yyyy-MM-dd');
        }
    }

    const datePatterns = [
        'dd/MM/yyyy',
        'd/MM/yyyy',
        'dd/MM/yy',
        'd/MM/yy',
        'yyyy/MM/dd',
        'yyyy-M-d',
        'dd-MM-yyyy',
        'd-M-yyyy',
        'dd-MM-yy',
        'yyyy-MM-dd',
    ];

    for (const pattern of datePatterns) {
        const parsed = parse(trimmed, pattern, new Date());

        if (isValid(parsed)) {
            return format(parsed, 'yyyy-MM-dd');
        }
    }

    return null;
}

function normalizeDateForSubmit(value: string): string {
    const parsed = parsedYmd(value);

    return parsed ?? value.trim();
}

function isYmdDate(value: string): boolean {
    const parsed = parsedYmd(value);

    return /^\d{4}-\d{2}-\d{2}$/.test(value) && parsed === value;
}

function normalizeTimeForSubmit(value: string): string {
    const trimmed = value.trim();
    const match = trimmed.match(/^(\d{1,2}):(\d{2})(?::\d{2})?$/);

    if (match === null) {
        return trimmed;
    }

    const hour = Number(match[1]);
    const minute = Number(match[2]);

    if (hour < 0 || hour > 23 || minute < 0 || minute > 59) {
        return trimmed;
    }

    return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
}

type TimeFieldProps = {
    id: string;
    label: string;
    value: string;
    error?: string;
    onChange: (value: string) => void;
    onClear: () => void;
};

function TimeField({
    id,
    label,
    value,
    error,
    onChange,
    onClear,
}: TimeFieldProps) {
    return (
        <div className="grid min-w-0 gap-2">
            <Label htmlFor={id}>{label}</Label>
            <div className="flex min-w-0 items-center overflow-hidden rounded-md border bg-background shadow-xs focus-within:border-ring focus-within:ring-[3px] focus-within:ring-ring/50">
                <span className="flex h-9 w-10 shrink-0 items-center justify-center border-r bg-muted/40 text-muted-foreground">
                    <Clock className="size-4" />
                </span>
                <Input
                    id={id}
                    type="time"
                    step="60"
                    value={normalizeTimeForSubmit(value)}
                    onChange={(event) => onChange(event.target.value)}
                    className="h-9 min-w-0 flex-1 rounded-none border-0 shadow-none focus-visible:ring-0"
                />
                {value ? (
                    <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-9 w-9 shrink-0 rounded-none text-muted-foreground hover:text-foreground"
                        onClick={onClear}
                        aria-label={`Clear ${label}`}
                    >
                        <X className="size-4" />
                    </Button>
                ) : null}
            </div>
            <InputError message={error} />
        </div>
    );
}

export function AssignmentForm({
    title,
    description,
    action,
    externalCoaches,
    trainingVenues,
    sports,
    statuses,
    attendanceModes,
    assignment,
}: Props) {
    const { t } = useTranslation();
    const [selectedMember, setSelectedMember] = useState<MemberOption | null>(
        assignment?.member ?? null,
    );
    const coachItems: ComboboxItem[] = externalCoaches.map((coach) => ({
        value: String(coach.id),
        label: coach.name,
        badge: t('Active'),
        description: [coach.email, coach.phone].filter(Boolean).join(' · '),
    }));
    const venueItems: ComboboxItem[] = trainingVenues.map((venue) => ({
        value: String(venue.id),
        label: venue.name,
        badge: t('Active'),
    }));
    const sportItems: ComboboxItem[] = sports.map((sport) => ({
        value: String(sport.id),
        label: sport.name,
        badge: t('Active'),
    }));
    const form = useForm<AssignmentFormData>({
        member_id: assignment?.member_id ? String(assignment.member_id) : '',
        external_coach_id: assignment?.external_coach_id
            ? String(assignment.external_coach_id)
            : '',
        training_venue_id: assignment?.training_venue_id
            ? String(assignment.training_venue_id)
            : '',
        sport_id: assignment?.sport_id ? String(assignment.sport_id) : '',
        start_date: assignment?.start_date ?? '',
        end_date: assignment?.end_date ?? '',
        training_days: assignment?.training_days ?? [],
        training_start_time: normalizeTimeForSubmit(
            assignment?.training_start_time ?? '',
        ),
        training_end_time: normalizeTimeForSubmit(
            assignment?.training_end_time ?? '',
        ),
        attendance_mode: assignment?.attendance_mode ?? 'single_mark',
        permission_reference_number:
            assignment?.permission_reference_number ?? '',
        permission_document: null,
        status: assignment?.status ?? 'draft',
        cancellation_reason: assignment?.cancellation_reason ?? '',
        completion_remarks: assignment?.completion_remarks ?? '',
        remarks: assignment?.remarks ?? '',
    });
    const canEditDates = assignment?.has_attendances !== true;

    function submit(event: React.FormEvent<HTMLFormElement>): void {
        event.preventDefault();

        form.clearErrors(
            'start_date',
            'end_date',
            'training_start_time',
            'training_end_time',
        );

        const normalizedStartDate = normalizeDateForSubmit(
            form.data.start_date,
        );
        const normalizedEndDate = normalizeDateForSubmit(form.data.end_date);
        const normalizedStartTime = normalizeTimeForSubmit(
            form.data.training_start_time,
        );
        const normalizedEndTime = normalizeTimeForSubmit(
            form.data.training_end_time,
        );
        const validationErrors: Partial<
            Record<
                | 'start_date'
                | 'end_date'
                | 'training_start_time'
                | 'training_end_time',
                string
            >
        > = {};

        if (!normalizedStartDate) {
            validationErrors.start_date = t(
                'The start date field is required.',
            );
        } else if (!isYmdDate(normalizedStartDate)) {
            validationErrors.start_date = t(
                'The start date must match the format Y-m-d.',
            );
        }

        if (!normalizedEndDate) {
            validationErrors.end_date = t('The end date field is required.');
        } else if (!isYmdDate(normalizedEndDate)) {
            validationErrors.end_date = t(
                'The end date must match the format Y-m-d.',
            );
        } else if (
            normalizedStartDate &&
            isYmdDate(normalizedStartDate) &&
            normalizedEndDate < normalizedStartDate
        ) {
            validationErrors.end_date = t(
                'The end date must be on or after the start date.',
            );
        }

        if (normalizedEndTime && !normalizedStartTime) {
            validationErrors.training_start_time = t(
                'The start time field is required when end time is present.',
            );
        }

        if (normalizedStartTime && !normalizedEndTime) {
            validationErrors.training_end_time = t(
                'The end time field is required when start time is present.',
            );
        } else if (
            normalizedStartTime &&
            normalizedEndTime &&
            normalizedEndTime <= normalizedStartTime
        ) {
            validationErrors.training_end_time = t(
                'The end time must be after the start time.',
            );
        }

        if (Object.keys(validationErrors).length > 0) {
            form.setError(validationErrors);

            return;
        }

        form.transform((data) => ({
            ...data,
            start_date: normalizedStartDate,
            end_date: normalizedEndDate,
            training_start_time: normalizedStartTime,
            training_end_time: normalizedEndTime,
        }));

        const method = action.method.toLowerCase();

        if (method === 'post' && typeof form.post === 'function') {
            form.post(action.url, { forceFormData: true });

            return;
        }

        if (method === 'put' && typeof form.put === 'function') {
            form.put(action.url, { forceFormData: true });

            return;
        }

        if (method === 'patch' && typeof form.patch === 'function') {
            form.patch(action.url, { forceFormData: true });

            return;
        }

        if (typeof (form as { submit?: unknown }).submit === 'function') {
            (
                form as {
                    submit: (
                        method: 'post' | 'put' | 'patch',
                        url: string,
                        options?: {
                            forceFormData?: boolean;
                        },
                    ) => void;
                }
            ).submit(method as 'post' | 'put' | 'patch', action.url, {
                forceFormData: true,
            });
        }
    }

    function setMember(member: MemberOption | null): void {
        setSelectedMember(member);
        form.setData('member_id', member ? String(member.id) : '');
        form.clearErrors('member_id');
    }

    function toggleDay(day: string): void {
        form.setData(
            'training_days',
            form.data.training_days.includes(day)
                ? form.data.training_days.filter(
                      (selectedDay) => selectedDay !== day,
                  )
                : [...form.data.training_days, day],
        );
        form.clearErrors('training_days');
    }

    const selectedDocumentName =
        form.data.permission_document?.name ??
        assignment?.permission_document?.name ??
        null;
    const selectedDocumentSize = form.data.permission_document?.size ?? null;
    const storedPermissionDocument = assignment?.permission_document;

    return (
        <div className="min-w-0 space-y-6 overflow-x-hidden">
            <div className="min-w-0">
                <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
                    <Heading title={title} description={description} />
                    <Button asChild variant="outline">
                        <Link href={index.url()}>
                            <ArrowLeft className="size-4" />
                            {t('Back')}
                        </Link>
                    </Button>
                </div>
            </div>

            <form onSubmit={submit} className="w-full min-w-0 space-y-4">
                <div className="overflow-hidden rounded-xl border bg-card">
                    <div className="flex items-center gap-3 border-b px-6 py-4">
                        <div className="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                            <CalendarCheck className="size-4" />
                        </div>
                        <div>
                            <h2 className="text-sm font-semibold">
                                {t('Assignment details')}
                            </h2>
                            <p className="text-xs text-muted-foreground">
                                {t(
                                    'Search by PNO or name, then set coach, venue, sport, and schedule.',
                                )}
                            </p>
                        </div>
                    </div>

                    <div className="min-w-0 space-y-6 p-6">
                        <div className="grid min-w-0 gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
                            <div className="grid min-w-0 gap-2">
                                <Label htmlFor="member_id">
                                    {t('Member')}{' '}
                                    <span className="text-destructive">*</span>
                                </Label>
                                <MemberPicker
                                    id="member_id"
                                    value={selectedMember}
                                    onChange={setMember}
                                    placeholder={t(
                                        'Search by PNO or member name',
                                    )}
                                    extraFilters={{ current_status: 'ACTIVE' }}
                                />
                                <InputError
                                    message={fieldError(
                                        form.errors,
                                        'member_id',
                                    )}
                                />
                            </div>

                            <div className="grid min-w-0 gap-2">
                                <Label htmlFor="external_coach_id">
                                    {t('External coach')}{' '}
                                    <span className="text-destructive">*</span>
                                </Label>
                                <Combobox
                                    id="external_coach_id"
                                    value={form.data.external_coach_id}
                                    onValueChange={(value) => {
                                        form.setData(
                                            'external_coach_id',
                                            value,
                                        );
                                        form.clearErrors('external_coach_id');
                                    }}
                                    items={coachItems}
                                    placeholder={t('Search coach')}
                                    searchPlaceholder={t(
                                        'Search by coach name, email, or phone',
                                    )}
                                    emptyMessage={t('No coach found.')}
                                />
                                <InputError
                                    message={fieldError(
                                        form.errors,
                                        'external_coach_id',
                                    )}
                                />
                            </div>

                            <div className="grid min-w-0 gap-2">
                                <Label htmlFor="training_venue_id">
                                    {t('Training venue')}{' '}
                                    <span className="text-destructive">*</span>
                                </Label>
                                <Combobox
                                    id="training_venue_id"
                                    value={form.data.training_venue_id}
                                    onValueChange={(value) => {
                                        form.setData(
                                            'training_venue_id',
                                            value,
                                        );
                                        form.clearErrors('training_venue_id');
                                    }}
                                    items={venueItems}
                                    placeholder={t('Search venue')}
                                    searchPlaceholder={t(
                                        'Search by venue name',
                                    )}
                                    emptyMessage={t('No venue found.')}
                                />
                                <InputError
                                    message={fieldError(
                                        form.errors,
                                        'training_venue_id',
                                    )}
                                />
                            </div>

                            <div className="grid min-w-0 gap-2">
                                <Label htmlFor="sport_id">
                                    {t('Sport')}{' '}
                                    <span className="text-destructive">*</span>
                                </Label>
                                <Combobox
                                    id="sport_id"
                                    value={form.data.sport_id}
                                    onValueChange={(value) => {
                                        form.setData('sport_id', value);
                                        form.clearErrors('sport_id');
                                    }}
                                    items={sportItems}
                                    placeholder={t('Search sport')}
                                    searchPlaceholder={t(
                                        'Search by sport name',
                                    )}
                                    emptyMessage={t('No sport found.')}
                                />
                                <InputError
                                    message={fieldError(
                                        form.errors,
                                        'sport_id',
                                    )}
                                />
                            </div>
                        </div>

                        <div className="grid min-w-0 gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
                            {!canEditDates ? (
                                <div className="col-span-full">
                                    <p className="text-xs text-muted-foreground">
                                        {t(
                                            'Assignment dates cannot be modified after attendance has been posted.',
                                        )}
                                    </p>
                                </div>
                            ) : null}

                            <div className="grid min-w-0 gap-2">
                                <Label htmlFor="start_date">
                                    {t('Start date')}{' '}
                                    <span className="text-destructive">*</span>
                                </Label>
                                <DatePicker
                                    id="start_date"
                                    disabled={!canEditDates}
                                    value={form.data.start_date}
                                    onChange={(value) => {
                                        form.setData('start_date', value);
                                        form.clearErrors('start_date');
                                    }}
                                    placeholder={t('Select start date')}
                                />
                                <InputError
                                    message={fieldError(
                                        form.errors,
                                        'start_date',
                                    )}
                                />
                            </div>
                            <div className="grid min-w-0 gap-2">
                                <Label htmlFor="end_date">
                                    {t('End date')}{' '}
                                    <span className="text-destructive">*</span>
                                </Label>
                                <DatePicker
                                    id="end_date"
                                    value={form.data.end_date}
                                    onChange={(value) => {
                                        form.setData('end_date', value);
                                        form.clearErrors('end_date');
                                    }}
                                    minDate={form.data.start_date}
                                    disabled={!canEditDates}
                                    placeholder={t('Select end date')}
                                />
                                <InputError
                                    message={fieldError(
                                        form.errors,
                                        'end_date',
                                    )}
                                />
                            </div>
                            <TimeField
                                id="training_start_time"
                                label={t('Start time')}
                                value={form.data.training_start_time}
                                onChange={(value) => {
                                    form.setData('training_start_time', value);
                                    form.clearErrors('training_start_time');
                                }}
                                onClear={() => {
                                    form.setData('training_start_time', '');
                                    form.clearErrors('training_start_time');
                                }}
                                error={fieldError(
                                    form.errors,
                                    'training_start_time',
                                )}
                            />
                            <TimeField
                                id="training_end_time"
                                label={t('End time')}
                                value={form.data.training_end_time}
                                onChange={(value) => {
                                    form.setData('training_end_time', value);
                                    form.clearErrors('training_end_time');
                                }}
                                onClear={() => {
                                    form.setData('training_end_time', '');
                                    form.clearErrors('training_end_time');
                                }}
                                error={fieldError(
                                    form.errors,
                                    'training_end_time',
                                )}
                            />
                        </div>

                        <div className="grid min-w-0 gap-2">
                            <Label>{t('Training days')}</Label>
                            <div className="grid min-w-0 gap-2 sm:grid-cols-[repeat(2,minmax(0,1fr))] xl:grid-cols-[repeat(4,minmax(0,1fr))]">
                                {DAYS.map((day) => (
                                    <label
                                        key={day}
                                        className={cn(
                                            'flex cursor-pointer items-center gap-2 rounded-md border px-3 py-2 text-sm transition-colors',
                                            form.data.training_days.includes(
                                                day,
                                            ) &&
                                                'border-primary/40 bg-primary/8 text-primary',
                                        )}
                                    >
                                        <input
                                            type="checkbox"
                                            className="size-4"
                                            checked={form.data.training_days.includes(
                                                day,
                                            )}
                                            onChange={() => toggleDay(day)}
                                        />
                                        <span>{t(day)}</span>
                                    </label>
                                ))}
                            </div>
                            <InputError
                                message={fieldError(
                                    form.errors,
                                    'training_days',
                                )}
                            />
                        </div>

                        <div className="grid min-w-0 gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
                            <div className="grid min-w-0 gap-2">
                                <Label htmlFor="attendance_mode">
                                    {t('Attendance mode')}
                                </Label>
                                <Select
                                    value={form.data.attendance_mode}
                                    onValueChange={(value) => {
                                        form.setData('attendance_mode', value);
                                        form.clearErrors('attendance_mode');
                                    }}
                                    required
                                >
                                    <SelectTrigger id="attendance_mode">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {attendanceModes.map((mode) => (
                                            <SelectItem key={mode} value={mode}>
                                                {t(mode)}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                <InputError
                                    message={fieldError(
                                        form.errors,
                                        'attendance_mode',
                                    )}
                                />
                            </div>
                            <div className="grid min-w-0 gap-2">
                                <Label htmlFor="status">{t('Status')}</Label>
                                <Select
                                    value={form.data.status}
                                    onValueChange={(value) => {
                                        form.setData('status', value);
                                        form.clearErrors('status');
                                    }}
                                    required
                                >
                                    <SelectTrigger id="status">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {statuses.map((status) => (
                                            <SelectItem
                                                key={status}
                                                value={status}
                                            >
                                                {t(status)}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                <InputError
                                    message={fieldError(form.errors, 'status')}
                                />
                            </div>
                        </div>
                    </div>
                </div>

                <div className="overflow-hidden rounded-xl border bg-card">
                    <div className="flex items-center gap-3 border-b px-6 py-4">
                        <div className="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                            <FileCheck2 className="size-4" />
                        </div>
                        <div>
                            <h2 className="text-sm font-semibold">
                                {t('Permission document')}
                            </h2>
                            <p className="text-xs text-muted-foreground">
                                {t(
                                    'Upload the permission order or approval document. Files are stored privately.',
                                )}
                            </p>
                        </div>
                    </div>
                    <div className="min-w-0 space-y-5 p-6">
                        <div className="grid min-w-0 gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
                            <div className="grid min-w-0 gap-2">
                                <Label htmlFor="permission_reference_number">
                                    {t('Permission reference')}
                                </Label>
                                <Input
                                    id="permission_reference_number"
                                    value={
                                        form.data.permission_reference_number
                                    }
                                    onChange={(event) => {
                                        form.setData(
                                            'permission_reference_number',
                                            event.target.value,
                                        );
                                        form.clearErrors(
                                            'permission_reference_number',
                                        );
                                    }}
                                />
                                <InputError
                                    message={fieldError(
                                        form.errors,
                                        'permission_reference_number',
                                    )}
                                />
                            </div>
                            <div className="grid min-w-0 gap-2">
                                <Label>{t('Document file')}</Label>
                                {storedPermissionDocument &&
                                form.data.permission_document === null ? (
                                    <div className="rounded-lg border bg-muted/30 px-3 py-2">
                                        <div className="flex items-start justify-between gap-2">
                                            <div className="min-w-0">
                                                <p className="text-sm font-medium text-foreground">
                                                    {storedPermissionDocument.original_name ??
                                                        storedPermissionDocument.name ??
                                                        t('Document attached')}
                                                </p>
                                                {fileSizeLabel(
                                                    storedPermissionDocument.size_bytes,
                                                ) ? (
                                                    <p className="text-xs text-muted-foreground">
                                                        {fileSizeLabel(
                                                            storedPermissionDocument.size_bytes,
                                                        )}
                                                    </p>
                                                ) : null}
                                            </div>
                                            <div className="flex shrink-0 gap-2">
                                                <ConfidentialDocumentPreview
                                                    document={{
                                                        ...storedPermissionDocument,
                                                    }}
                                                    sizeLabel={fileSizeLabel(
                                                        storedPermissionDocument.size_bytes,
                                                    )}
                                                    triggerLabel={t('View')}
                                                />
                                                <Button
                                                    asChild
                                                    size="sm"
                                                    variant="outline"
                                                >
                                                    <a
                                                        href={
                                                            storedPermissionDocument.download_url
                                                        }
                                                        className="gap-1.5"
                                                    >
                                                        <Download className="size-3.5" />
                                                        {t('Download')}
                                                    </a>
                                                </Button>
                                            </div>
                                        </div>
                                    </div>
                                ) : null}
                                <label className="flex min-w-0 cursor-pointer items-start gap-3 rounded-lg border border-dashed bg-muted/30 p-3 transition-colors hover:bg-muted/50">
                                    <span className="mt-0.5 rounded-md bg-background p-2 text-muted-foreground shadow-sm">
                                        <Upload className="size-4" />
                                    </span>
                                    <span className="min-w-0 flex-1">
                                        <span className="block text-sm font-medium break-words">
                                            {selectedDocumentName ??
                                                t('Upload permission document')}
                                        </span>
                                        {selectedDocumentSize ? (
                                            <span className="mt-1 block text-xs break-words text-muted-foreground">
                                                {fileSizeLabel(
                                                    selectedDocumentSize,
                                                )}
                                            </span>
                                        ) : null}
                                        <span className="mt-1 block text-xs break-words text-muted-foreground">
                                            {t(
                                                'PDF, JPG, PNG, or WEBP up to 5 MB.',
                                            )}
                                        </span>
                                    </span>
                                    <Input
                                        className="sr-only"
                                        type="file"
                                        accept="application/pdf,image/jpeg,image/png,image/webp"
                                        onChange={(event) => {
                                            form.setData(
                                                'permission_document',
                                                event.target.files?.[0] ?? null,
                                            );
                                            form.clearErrors(
                                                'permission_document',
                                            );
                                        }}
                                    />
                                </label>
                                {form.progress ? (
                                    <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                                        <div
                                            className="h-full rounded-full bg-primary transition-all"
                                            style={{
                                                width: `${form.progress.percentage ?? 0}%`,
                                            }}
                                        />
                                    </div>
                                ) : null}
                                <InputError
                                    message={fieldError(
                                        form.errors,
                                        'permission_document',
                                    )}
                                />
                            </div>
                        </div>

                        <div className="grid min-w-0 gap-2">
                            <Label htmlFor="remarks">{t('Remarks')}</Label>
                            <Textarea
                                id="remarks"
                                rows={3}
                                value={form.data.remarks}
                                onChange={(event) => {
                                    form.setData('remarks', event.target.value);
                                    form.clearErrors('remarks');
                                }}
                            />
                            <InputError
                                message={fieldError(form.errors, 'remarks')}
                            />
                        </div>
                    </div>
                </div>

                <div className="flex justify-end gap-2">
                    <Button asChild variant="outline">
                        <Link href={index.url()}>{t('Cancel')}</Link>
                    </Button>
                    <Button type="submit" disabled={form.processing}>
                        {form.processing ? t('Saving...') : t('Save')}
                    </Button>
                </div>
            </form>
        </div>
    );
}
