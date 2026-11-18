import { Form, Head, Link, router } from '@inertiajs/react';
import {
    ArrowLeft,
    Camera,
    Download,
    Dumbbell,
    FileText,
    IdCard,
    Plus,
    Trash2,
    UserRound,
} from 'lucide-react';
import { useState } from 'react';

import type { update } from '@/actions/App/Http/Controllers/ExternalCoachController';
import {
    index,
    store,
} from '@/actions/App/Http/Controllers/ExternalCoachController';
import { ClearableSelect } from '@/components/clearable-select';
import Heading from '@/components/heading';
import InputError from '@/components/input-error';
import { OptionMultiSelect } from '@/components/option-multi-select';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
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
import {
    DOCUMENT_TYPES,
    documentTypeLabel,
} from '@/lib/external-coach-documents';

type Option = { id: number; name: string };

type Props = {
    statuses: string[];
    sports: Option[];
    trainingVenues: Option[];
};

export default function ExternalCoachesCreate({
    statuses,
    sports,
    trainingVenues,
}: Props) {
    const { t } = useTranslation();

    return (
        <>
            <Head title={t('Create external coach')} />
            <ExternalCoachForm
                title={t('Create external coach')}
                description={t(
                    'Create a separate login profile for an approved external training coach.',
                )}
                action={store()}
                statuses={statuses}
                sports={sports}
                trainingVenues={trainingVenues}
            />
        </>
    );
}

type FormProps = {
    title: string;
    description: string;
    action: ReturnType<typeof store> | ReturnType<typeof update>;
    statuses: string[];
    sports: Option[];
    trainingVenues: Option[];
    coach?: {
        id?: number;
        photo_path?: string | null;
        sport_ids?: string[];
        training_venue_ids?: string[];
        documents?: {
            id: number;
            type: string;
            original_name: string;
        }[];
        name: string;
        email: string;
        phone: string | null;
        status: string;
        experience_years: number | null;
        city: string | null;
        remarks: string | null;
    };
};

function ExternalCoachForm({
    title,
    description,
    action,
    statuses,
    sports,
    trainingVenues,
    coach,
}: FormProps) {
    const { t } = useTranslation();
    const [photoPreview, setPhotoPreview] = useState<string | null>(
        coach?.photo_path ? `/storage/${coach.photo_path}` : null,
    );
    const [removePhoto, setRemovePhoto] = useState(false);
    const [sportIds, setSportIds] = useState<string[]>(coach?.sport_ids ?? []);
    const [venueIds, setVenueIds] = useState<string[]>(
        coach?.training_venue_ids ?? [],
    );
    const [documentRows, setDocumentRows] = useState<
        { key: number; type: string }[]
    >([]);
    const documentTypeOptions = DOCUMENT_TYPES.map((type) => ({
        value: type,
        label: documentTypeLabel(type, t),
    }));

    function removeSavedDocument(documentId: number) {
        router.delete(
            `/external-coaches/${coach?.id}/documents/${documentId}`,
            {
                preserveScroll: true,
            },
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <Heading title={title} description={description} />
                <Button asChild variant="outline">
                    <Link href={index.url()}>
                        <ArrowLeft className="size-4" />
                        {t('Back')}
                    </Link>
                </Button>
            </div>

            <Form action={action} className="space-y-4">
                {({ errors, processing }) => (
                    <>
                        <div className="overflow-hidden rounded-xl border bg-card">
                            <div className="flex items-center gap-3 border-b px-6 py-4">
                                <div className="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                                    <IdCard className="size-4" />
                                </div>
                                <div>
                                    <h2 className="text-sm font-semibold">
                                        {t('Coach profile')}
                                    </h2>
                                    <p className="text-xs text-muted-foreground">
                                        {t(
                                            'Identity, login, experience, and status',
                                        )}
                                    </p>
                                </div>
                            </div>

                            <div className="space-y-5 p-6">
                                <div className="flex items-center gap-4">
                                    <Avatar className="size-20 border">
                                        {photoPreview && !removePhoto && (
                                            <AvatarImage
                                                src={photoPreview}
                                                alt=""
                                                className="object-cover"
                                            />
                                        )}
                                        <AvatarFallback>
                                            <UserRound className="size-8 text-muted-foreground/60" />
                                        </AvatarFallback>
                                    </Avatar>
                                    <div className="grid gap-1.5">
                                        <div className="flex flex-wrap gap-2">
                                            <Button
                                                asChild
                                                type="button"
                                                variant="outline"
                                                size="sm"
                                            >
                                                <label
                                                    htmlFor="photo"
                                                    className="cursor-pointer"
                                                >
                                                    <Camera className="size-4" />
                                                    {t('Upload photo')}
                                                </label>
                                            </Button>
                                            {photoPreview && !removePhoto && (
                                                <Button
                                                    type="button"
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => {
                                                        setRemovePhoto(true);
                                                        setPhotoPreview(null);
                                                        const input =
                                                            document.getElementById(
                                                                'photo',
                                                            ) as HTMLInputElement | null;

                                                        if (input) {
                                                            input.value = '';
                                                        }
                                                    }}
                                                >
                                                    {t('Remove photo')}
                                                </Button>
                                            )}
                                        </div>
                                        <p className="text-xs text-muted-foreground">
                                            {t('JPG, PNG or WebP, up to 2 MB.')}
                                        </p>
                                        <input
                                            id="photo"
                                            name="photo"
                                            type="file"
                                            accept="image/jpeg,image/png,image/webp"
                                            className="sr-only"
                                            onChange={(event) => {
                                                const file =
                                                    event.target.files?.[0];

                                                if (file) {
                                                    setRemovePhoto(false);
                                                    setPhotoPreview(
                                                        URL.createObjectURL(
                                                            file,
                                                        ),
                                                    );
                                                }
                                            }}
                                        />
                                        {removePhoto && (
                                            <input
                                                type="hidden"
                                                name="remove_photo"
                                                value="1"
                                            />
                                        )}
                                        <InputError message={errors.photo} />
                                    </div>
                                </div>

                                <div className="grid gap-5 sm:grid-cols-2">
                                    <div className="grid gap-2">
                                        <Label htmlFor="name">
                                            {t('Name')}{' '}
                                            <span className="text-destructive">
                                                *
                                            </span>
                                        </Label>
                                        <Input
                                            id="name"
                                            name="name"
                                            defaultValue={coach?.name}
                                            required
                                        />
                                        <InputError message={errors.name} />
                                    </div>
                                    <div className="grid gap-2">
                                        <Label htmlFor="email">
                                            {t('Email')}{' '}
                                            <span className="text-destructive">
                                                *
                                            </span>
                                        </Label>
                                        <Input
                                            id="email"
                                            name="email"
                                            type="email"
                                            defaultValue={coach?.email}
                                            required
                                        />
                                        <InputError message={errors.email} />
                                    </div>
                                    <div className="grid gap-2">
                                        <Label htmlFor="phone">
                                            {t('Phone')}
                                        </Label>
                                        <Input
                                            id="phone"
                                            name="phone"
                                            type="tel"
                                            inputMode="tel"
                                            pattern="(?:\+91[-\s]?|0)?[6-9][0-9]{9}"
                                            title={t(
                                                'Enter a valid Indian mobile number.',
                                            )}
                                            placeholder={t(
                                                '10-digit Indian mobile number',
                                            )}
                                            defaultValue={coach?.phone ?? ''}
                                        />
                                        <p className="text-xs text-muted-foreground">
                                            {t(
                                                'Use a 10-digit Indian mobile number, with optional +91.',
                                            )}
                                        </p>
                                        <InputError message={errors.phone} />
                                    </div>
                                    <div className="grid gap-2">
                                        <Label htmlFor="password">
                                            {t('Password')}{' '}
                                            {!coach && (
                                                <span className="text-destructive">
                                                    *
                                                </span>
                                            )}
                                        </Label>
                                        <Input
                                            id="password"
                                            name="password"
                                            type="password"
                                            required={!coach}
                                        />
                                        {coach ? (
                                            <p className="text-xs text-muted-foreground">
                                                {t(
                                                    'Leave blank to keep the current password.',
                                                )}
                                            </p>
                                        ) : null}
                                        <InputError message={errors.password} />
                                    </div>
                                    <div className="grid gap-2">
                                        <Label htmlFor="experience_years">
                                            {t('Experience years')}
                                        </Label>
                                        <Input
                                            id="experience_years"
                                            name="experience_years"
                                            type="number"
                                            min="0"
                                            max="80"
                                            defaultValue={
                                                coach?.experience_years ?? ''
                                            }
                                        />
                                        <InputError
                                            message={errors.experience_years}
                                        />
                                    </div>
                                    <div className="grid gap-2">
                                        <Label htmlFor="status">
                                            {t('Status')}
                                        </Label>
                                        <Select
                                            name="status"
                                            defaultValue={
                                                coach?.status ?? 'active'
                                            }
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
                                        <InputError message={errors.status} />
                                    </div>
                                </div>

                                <div className="grid gap-2">
                                    <Label htmlFor="city">{t('City')}</Label>
                                    <Input
                                        id="city"
                                        name="city"
                                        defaultValue={coach?.city ?? ''}
                                    />
                                    <InputError message={errors.city} />
                                </div>

                                <div className="grid gap-2">
                                    <Label htmlFor="remarks">
                                        {t('Remarks')}
                                    </Label>
                                    <Textarea
                                        id="remarks"
                                        name="remarks"
                                        rows={4}
                                        defaultValue={coach?.remarks ?? ''}
                                    />
                                    <InputError message={errors.remarks} />
                                </div>

                                <div className="grid gap-2">
                                    <Label htmlFor="status_reason">
                                        {t('Status reason')}
                                    </Label>
                                    <Textarea
                                        id="status_reason"
                                        name="status_reason"
                                        rows={3}
                                    />
                                    <InputError
                                        message={errors.status_reason}
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="overflow-hidden rounded-xl border bg-card">
                            <div className="flex items-center gap-3 border-b px-6 py-4">
                                <div className="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                                    <Dumbbell className="size-4" />
                                </div>
                                <div>
                                    <h2 className="text-sm font-semibold">
                                        {t('Sports & training venues')}
                                    </h2>
                                    <p className="text-xs text-muted-foreground">
                                        {t(
                                            'Sports this coach trains and where they train.',
                                        )}
                                    </p>
                                </div>
                            </div>
                            <div className="grid gap-5 p-6 sm:grid-cols-2">
                                <div className="grid gap-2">
                                    <Label>{t('Sports')}</Label>
                                    <OptionMultiSelect
                                        clearable
                                        value={sportIds}
                                        onValueChange={setSportIds}
                                        options={sports.map((sport) => ({
                                            value: String(sport.id),
                                            label: sport.name,
                                        }))}
                                        placeholder={t('Select sports')}
                                        className="w-full"
                                    />
                                    {sportIds.map((id) => (
                                        <input
                                            key={id}
                                            type="hidden"
                                            name="sport_ids[]"
                                            value={id}
                                        />
                                    ))}
                                    <InputError message={errors.sport_ids} />
                                </div>
                                <div className="grid gap-2">
                                    <Label>{t('Training venues')}</Label>
                                    <OptionMultiSelect
                                        clearable
                                        value={venueIds}
                                        onValueChange={setVenueIds}
                                        options={trainingVenues.map(
                                            (venue) => ({
                                                value: String(venue.id),
                                                label: venue.name,
                                            }),
                                        )}
                                        placeholder={t('Select venues')}
                                        className="w-full"
                                    />
                                    {venueIds.map((id) => (
                                        <input
                                            key={id}
                                            type="hidden"
                                            name="training_venue_ids[]"
                                            value={id}
                                        />
                                    ))}
                                    <InputError
                                        message={errors.training_venue_ids}
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="overflow-hidden rounded-xl border bg-card">
                            <div className="flex items-center gap-3 border-b px-6 py-4">
                                <div className="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                                    <FileText className="size-4" />
                                </div>
                                <div className="flex-1">
                                    <h2 className="text-sm font-semibold">
                                        {t('Documents')}
                                    </h2>
                                    <p className="text-xs text-muted-foreground">
                                        {t(
                                            'Aadhaar, PAN, certificates and other proofs. PDF or image, up to 20 MB each.',
                                        )}
                                    </p>
                                </div>
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={() =>
                                        setDocumentRows((rows) => [
                                            ...rows,
                                            { key: Date.now(), type: '' },
                                        ])
                                    }
                                >
                                    <Plus className="size-4" />
                                    {t('Add document')}
                                </Button>
                            </div>
                            <div className="space-y-3 p-6">
                                {coach?.documents?.map((document) => (
                                    <div
                                        key={document.id}
                                        className="flex items-center gap-3 rounded-md border px-3 py-2 text-sm"
                                    >
                                        <FileText className="size-4 shrink-0 text-muted-foreground" />
                                        <span className="w-40 shrink-0 font-medium">
                                            {documentTypeLabel(
                                                document.type,
                                                t,
                                            )}
                                        </span>
                                        <a
                                            href={`/external-coaches/${coach.id}/documents/${document.id}`}
                                            target="_blank"
                                            rel="noreferrer"
                                            className="min-w-0 flex-1 truncate text-primary hover:underline"
                                        >
                                            {document.original_name}
                                        </a>
                                        <Button
                                            asChild
                                            variant="ghost"
                                            size="icon"
                                            title={t('Download')}
                                        >
                                            <a
                                                href={`/external-coaches/${coach.id}/documents/${document.id}?download=1`}
                                            >
                                                <Download className="size-4" />
                                            </a>
                                        </Button>
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="icon"
                                            title={t('Remove')}
                                            onClick={() =>
                                                removeSavedDocument(document.id)
                                            }
                                        >
                                            <Trash2 className="size-4" />
                                        </Button>
                                    </div>
                                ))}
                                {documentRows.map((row, index) => (
                                    <div
                                        key={row.key}
                                        className="grid items-start gap-3 sm:grid-cols-[200px_1fr_auto]"
                                    >
                                        <div className="grid gap-1">
                                            <ClearableSelect
                                                value={row.type}
                                                onValueChange={(type) =>
                                                    setDocumentRows((rows) =>
                                                        rows.map((item) =>
                                                            item.key === row.key
                                                                ? {
                                                                      ...item,
                                                                      type,
                                                                  }
                                                                : item,
                                                        ),
                                                    )
                                                }
                                                options={documentTypeOptions}
                                                placeholder={t('Document type')}
                                            />
                                            <input
                                                type="hidden"
                                                name={`documents[${index}][type]`}
                                                value={row.type}
                                            />
                                            <InputError
                                                message={
                                                    errors[
                                                        `documents.${index}.type`
                                                    ]
                                                }
                                            />
                                        </div>
                                        <div className="grid gap-1">
                                            <Input
                                                type="file"
                                                name={`documents[${index}][file]`}
                                                accept=".pdf,image/jpeg,image/png,image/webp"
                                                required
                                            />
                                            <InputError
                                                message={
                                                    errors[
                                                        `documents.${index}.file`
                                                    ]
                                                }
                                            />
                                        </div>
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="icon"
                                            title={t('Remove')}
                                            onClick={() =>
                                                setDocumentRows((rows) =>
                                                    rows.filter(
                                                        (item) =>
                                                            item.key !==
                                                            row.key,
                                                    ),
                                                )
                                            }
                                        >
                                            <Trash2 className="size-4" />
                                        </Button>
                                    </div>
                                ))}
                                {!coach?.documents?.length &&
                                documentRows.length === 0 ? (
                                    <p className="text-sm text-muted-foreground">
                                        {t('No documents added yet.')}
                                    </p>
                                ) : null}
                            </div>
                        </div>

                        <div className="flex justify-end gap-2">
                            <Button asChild variant="outline">
                                <Link href={index.url()}>{t('Cancel')}</Link>
                            </Button>
                            <Button type="submit" disabled={processing}>
                                {processing ? t('Saving...') : t('Save')}
                            </Button>
                        </div>
                    </>
                )}
            </Form>
        </div>
    );
}

export { ExternalCoachForm };
