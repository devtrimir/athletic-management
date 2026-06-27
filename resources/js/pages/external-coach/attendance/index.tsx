import { Form, Head, Link } from '@inertiajs/react';
import { AlertCircle, ArrowLeft, Camera, CheckCircle2, ClipboardCheck, ImageUp, LocateFixed, Save } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

import type { ComboboxItem } from '@/components/combobox';
import { Combobox } from '@/components/combobox';
import { DatePicker } from '@/components/date-picker';
import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
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
import { Textarea } from '@/components/ui/textarea';
import { useTranslation } from '@/hooks/use-translation';

type Assignment = {
    id: number;
    start_date: string;
    end_date: string;
    training_start_time: string | null;
    training_end_time: string | null;
    member: {
        pno: string | null;
        full_name: string;
    };
    training_venue: {
        name: string;
    };
    sport: {
        name: string;
    };
};

type Props = {
    assignments: Assignment[];
    selectedAssignmentId: string | null;
    attendanceStatuses: string[];
};

const allowedPhotoTypes = ['image/jpeg', 'image/png', 'image/webp'];
const maxPhotoSizeBytes = 10 * 1024 * 1024;

export default function ExternalCoachAttendance({ assignments, selectedAssignmentId, attendanceStatuses }: Props) {
    const { t } = useTranslation();
    const [assignmentId, setAssignmentId] = useState(selectedAssignmentId ?? '');
    const [attendanceDate, setAttendanceDate] = useState(todayIsoDate());
    const [attendanceStatus, setAttendanceStatus] = useState('present');
    const [location, setLocation] = useState({ latitude: '', longitude: '', accuracy: '' });
    const [locationStatus, setLocationStatus] = useState<string | null>(null);
    const [locating, setLocating] = useState(false);
    const [photoState, setPhotoState] = useState({
        name: '',
        sizeLabel: '',
        status: t('No photo selected'),
        valid: false,
    });
    const [cameraOpen, setCameraOpen] = useState(false);
    const [cameraStatus, setCameraStatus] = useState<string | null>(null);
    const cameraInputRef = useRef<HTMLInputElement>(null);
    const galleryInputRef = useRef<HTMLInputElement>(null);
    const cameraStreamRef = useRef<MediaStream | null>(null);
    const videoRef = useRef<HTMLVideoElement>(null);
    const selectedAssignment = assignments.find((assignment) => String(assignment.id) === assignmentId);
    const secureLocationUrl = getSecureLocationUrl();
    const locationCaptured = location.latitude !== '' && location.longitude !== '';
    const photoReady = photoState.valid;
    const proofRequired = ['present', 'late'].includes(attendanceStatus);
    const assignmentItems: ComboboxItem[] = assignments.map((assignment) => ({
        value: String(assignment.id),
        label: assignment.member.full_name,
        badge: assignment.sport.name,
        description: [assignment.member.pno, assignment.training_venue.name].filter(Boolean).join(' · '),
    }));

    useEffect(() => {
        return () => {
            stopCameraStream(cameraStreamRef.current);
            cameraStreamRef.current = null;
        };
    }, []);

    function openCamera() {
        setCameraOpen(true);
        setCameraStatus(t('Starting camera...'));

        if (!navigator.mediaDevices?.getUserMedia) {
            setCameraStatus(t('Camera is not supported by this browser.'));

            return;
        }

        window.setTimeout(() => {
            navigator.mediaDevices
                .getUserMedia({ video: { facingMode: { ideal: 'environment' } }, audio: false })
                .then((stream) => {
                    cameraStreamRef.current = stream;
                    setCameraStatus(null);

                    if (videoRef.current) {
                        videoRef.current.srcObject = stream;
                    }
                })
                .catch(() => {
                    setCameraStatus(t('Unable to open camera. Please allow camera permission or use Upload.'));
                });
        }, 0);
    }

    function closeCamera() {
        stopCameraStream(cameraStreamRef.current);
        cameraStreamRef.current = null;
        setCameraOpen(false);
    }

    function fillCurrentLocation() {
        if (!isSecureLocationContext()) {
            setLocationStatus(t('Location access needs HTTPS on phone browsers. Open the secure link and try again.'));

            return;
        }

        if (!navigator.geolocation) {
            setLocationStatus(t('Location is not supported by this browser.'));

            return;
        }

        setLocating(true);
        setLocationStatus(t('Getting current location...'));

        requestCurrentLocation(
            (position) => {
                setCapturedLocation(position);
                setLocationStatus(t('Location captured from this phone.'));
                setLocating(false);
            },
            () => {
                setLocationStatus(t('Current GPS fix is still warming up. Trying again with lower power mode...'));

                requestCurrentLocation(
                    (position) => {
                        setCapturedLocation(position);
                        setLocationStatus(t('Location captured from this phone.'));
                        setLocating(false);
                    },
                    (error) => {
                        if (isLocationFixUnavailable(error)) {
                            setLocationStatus(
                                t('Waiting for a fresh GPS fix (kCLErrorLocationUnknown). Keep the app open and move to an open area.'),
                            );
                        } else {
                            setLocationStatus(t('Waiting for a fresh GPS fix...'));
                        }

                        watchCurrentLocation(
                            (position) => {
                                setCapturedLocation(position);
                                setLocationStatus(t('Location captured from this phone.'));
                                setLocating(false);
                            },
                            (watchError) => {
                                setLocationStatus(locationErrorMessage(watchError ?? error, t));
                                setLocating(false);
                            },
                            true,
                        );
                    },
                    false,
                );
            },
            true,
        );
    }

    function setCapturedLocation(position: GeolocationPosition) {
        setLocation({
            latitude: position.coords.latitude.toFixed(7),
            longitude: position.coords.longitude.toFixed(7),
            accuracy: Math.round(position.coords.accuracy).toString(),
        });
    }

    function handlePhotoSelected(file: File | null) {
        if (!file) {
            resetPhotoState();

            return;
        }

        if (!allowedPhotoTypes.includes(file.type)) {
            setPhotoState({
                name: file.name,
                sizeLabel: formatFileSize(file.size),
                status: t('Only JPG, PNG, or WebP images are allowed.'),
                valid: false,
            });

            return;
        }

        if (file.size > maxPhotoSizeBytes) {
            setPhotoState({
                name: file.name,
                sizeLabel: formatFileSize(file.size),
                status: t('Photo must be 10 MB or smaller.'),
                valid: false,
            });

            return;
        }

        setPhotoState({
            name: file.name,
            sizeLabel: formatFileSize(file.size),
            status: t('Photo looks valid and ready to upload.'),
            valid: true,
        });
    }

    function resetPhotoState() {
        setPhotoState({
            name: '',
            sizeLabel: '',
            status: t('No photo selected'),
            valid: false,
        });
    }

    function resetAttendanceForm() {
        setAssignmentId('');
        setAttendanceDate(todayIsoDate());
        setAttendanceStatus('present');
        setLocation({ latitude: '', longitude: '', accuracy: '' });
        setLocationStatus(null);
        resetPhotoState();

        if (cameraInputRef.current) {
            cameraInputRef.current.value = '';
        }

        if (galleryInputRef.current) {
            galleryInputRef.current.value = '';
        }
    }

    function captureCameraPhoto() {
        const video = videoRef.current;

        if (!video || video.videoWidth === 0 || video.videoHeight === 0) {
            setCameraStatus(t('Camera is not ready yet.'));

            return;
        }

        const canvas = document.createElement('canvas');
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        canvas.getContext('2d')?.drawImage(video, 0, 0, canvas.width, canvas.height);

        canvas.toBlob((blob) => {
            if (!blob || !cameraInputRef.current) {
                setCameraStatus(t('Unable to capture photo. Please try again.'));

                return;
            }

            const file = new File([blob], `attendance-proof-${todayIsoDate()}.jpg`, { type: 'image/jpeg' });
            const transfer = new DataTransfer();
            transfer.items.add(file);
            cameraInputRef.current.files = transfer.files;

            if (galleryInputRef.current) {
                galleryInputRef.current.value = '';
            }

            handlePhotoSelected(file);
            closeCamera();
        }, 'image/jpeg', 0.9);
    }

    return (
        <>
            <Head title={t('Training attendance')} />

            <main className="min-h-screen bg-muted/20">
                <div className="mx-auto flex w-full max-w-5xl flex-col gap-4 px-3 py-4 pb-[calc(1rem+env(safe-area-inset-bottom))] sm:gap-6 sm:px-6 lg:py-8">
                    <header className="rounded-lg border bg-card px-4 py-4 shadow-sm sm:px-5">
                        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                            <div className="min-w-0">
                                <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-normal text-muted-foreground">
                                    <ClipboardCheck className="size-3.5" />
                                    {t('External training portal')}
                                </div>
                                <h1 className="mt-1 text-xl font-semibold tracking-tight">
                                    {t('Training attendance')}
                                </h1>
                                <p className="mt-1 text-sm text-muted-foreground">
                                    {t('Submit attendance proof for assigned athletes.')}
                                </p>
                            </div>

                            <Button asChild variant="outline" className="w-full sm:w-auto">
                                <Link href="/external-coach/dashboard">
                                    <ArrowLeft className="size-4" />
                                    {t('Dashboard')}
                                </Link>
                            </Button>
                        </div>
                    </header>

                    <section className="rounded-lg border bg-card p-4 shadow-sm sm:p-5">
                        <div className="flex min-w-0 items-start gap-3">
                            <div className="flex size-10 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
                                <Camera className="size-5" />
                            </div>
                            <div className="min-w-0">
                                <div className="text-xs font-medium text-muted-foreground">{t('Selected athlete')}</div>
                                <h2 className="mt-1 truncate text-base font-semibold">
                                    {selectedAssignment?.member.full_name ?? t('Choose an assigned athlete')}
                                </h2>
                                <div className="mt-2 flex flex-wrap gap-2 text-xs text-muted-foreground">
                                    {selectedAssignment ? (
                                        <>
                                            {selectedAssignment.member.pno ? <span className="rounded-md border px-2 py-1">{selectedAssignment.member.pno}</span> : null}
                                            <span className="rounded-md border px-2 py-1">{selectedAssignment.sport.name}</span>
                                            <span className="rounded-md border px-2 py-1">{selectedAssignment.training_venue.name}</span>
                                        </>
                                    ) : (
                                        <span>{t('Search and select the assigned athlete before submitting attendance.')}</span>
                                    )}
                                </div>
                            </div>
                        </div>
                    </section>

                    <Form
                        action="/external-coach/attendance"
                        method="post"
                        encType="multipart/form-data"
                        resetOnSuccess
                        onSuccess={resetAttendanceForm}
                        className="grid gap-5 rounded-lg border bg-card p-4 shadow-sm sm:p-5"
                    >
                        {({ errors, processing, progress }) => (
                            <>
                                <div className="grid gap-2">
                                    <Label htmlFor="external_coaching_assignment_id">
                                        {t('Assigned athlete')}
                                    </Label>
                                    <input type="hidden" name="external_coaching_assignment_id" value={assignmentId} />
                                    <Combobox
                                        id="external_coaching_assignment_id"
                                        value={assignmentId}
                                        onValueChange={setAssignmentId}
                                        items={assignmentItems}
                                        placeholder={t('Search assigned athlete')}
                                        searchPlaceholder={t('Search by athlete, PNO, venue, or sport')}
                                        emptyMessage={t('No assigned athlete found.')}
                                    />
                                    <InputError message={errors.external_coaching_assignment_id} />
                                </div>

                                <div className="grid gap-4 sm:grid-cols-2">
                                    <div className="grid gap-2">
                                        <Label htmlFor="attendance_date">{t('Date')}</Label>
                                        <input type="hidden" name="attendance_date" value={attendanceDate} />
                                        <div className="flex gap-2">
                                            <DatePicker
                                                id="attendance_date"
                                                value={attendanceDate}
                                                onChange={setAttendanceDate}
                                                placeholder={t('Select date')}
                                                className="min-w-0 flex-1"
                                            />
                                            <Button type="button" variant="outline" onClick={() => setAttendanceDate(todayIsoDate())}>
                                                {t('Today')}
                                            </Button>
                                        </div>
                                        <InputError message={errors.attendance_date} />
                                    </div>

                                    <div className="grid gap-2">
                                        <Label htmlFor="attendance_status">{t('Status')}</Label>
                                        <Select name="attendance_status" value={attendanceStatus} onValueChange={setAttendanceStatus}>
                                            <SelectTrigger id="attendance_status">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {attendanceStatuses.map((status) => (
                                                    <SelectItem key={status} value={status}>
                                                        {t(status)}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                        <InputError message={errors.attendance_status} />
                                    </div>
                                </div>

                                <div className="grid gap-3 rounded-lg border bg-muted/20 p-3 sm:p-4">
                                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                                        <div>
                                            <Label>{t('Training location')}</Label>
                                            <p className="mt-1 text-xs text-muted-foreground">
                                                {proofRequired
                                                    ? t('Use this phone location for accurate attendance verification.')
                                                    : t('Location is optional for this attendance status.')}
                                            </p>
                                        </div>
                                        <Button type="button" variant="outline" onClick={fillCurrentLocation} disabled={locating || !proofRequired} className="w-full sm:w-auto">
                                            <LocateFixed className="size-4" />
                                            {locating ? t('Locating...') : t('Use current location')}
                                        </Button>
                                    </div>

                                    {!isSecureLocationContext() ? (
                                        <div className="flex flex-col gap-3 rounded-md border border-amber-200 bg-amber-50 p-3 text-amber-900 sm:flex-row sm:items-center sm:justify-between dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-100">
                                            <div className="flex gap-2 text-sm">
                                                <AlertCircle className="mt-0.5 size-4 shrink-0" />
                                                <span>{t('GPS capture requires HTTPS on mobile browsers.')}</span>
                                            </div>
                                            {secureLocationUrl ? (
                                                <Button asChild type="button" variant="outline" className="w-full bg-background sm:w-auto">
                                                    <a href={secureLocationUrl}>{t('Open HTTPS')}</a>
                                                </Button>
                                            ) : null}
                                        </div>
                                    ) : null}

                                    <input type="hidden" name="submitted_latitude" value={location.latitude} />
                                    <input type="hidden" name="submitted_longitude" value={location.longitude} />
                                    <input type="hidden" name="submitted_gps_accuracy" value={location.accuracy} />

                                    <div className="grid gap-3 sm:grid-cols-3">
                                        <ReadOnlyLocationValue label={t('Latitude')} value={location.latitude} emptyLabel={t('Not captured')} />
                                        <ReadOnlyLocationValue label={t('Longitude')} value={location.longitude} emptyLabel={t('Not captured')} />
                                        <ReadOnlyLocationValue label={t('Accuracy')} value={location.accuracy ? `${location.accuracy} ${t('m')}` : ''} emptyLabel={t('Not captured')} />
                                    </div>

                                    {locationStatus ? <p className="text-xs text-muted-foreground">{locationStatus}</p> : null}
                                    <InputError message={errors.submitted_latitude} />
                                    <InputError message={errors.submitted_longitude} />
                                    <InputError message={errors.submitted_gps_accuracy} />
                                </div>

                                <div className="grid gap-2">
                                    <Label htmlFor="submitted_photo">{t('Proof photo')}</Label>
                                    <div className="grid gap-3 rounded-lg border bg-muted/20 p-3 sm:p-4">
                                        <div className="grid grid-cols-2 gap-2">
                                            <Button type="button" variant="outline" onClick={openCamera}>
                                                <Camera className="size-4" />
                                                {t('Camera')}
                                            </Button>
                                            <Button asChild type="button" variant="outline">
                                                <label htmlFor="submitted_photo_upload" className="cursor-pointer">
                                                    <ImageUp className="size-4" />
                                                    {t('Upload')}
                                                </label>
                                            </Button>
                                        </div>

                                        <Input
                                            ref={cameraInputRef}
                                            id="submitted_photo_camera"
                                            name="submitted_photo"
                                            type="file"
                                            accept="image/*"
                                            capture="environment"
                                            required={proofRequired}
                                            className="sr-only"
                                            onChange={(event) => {
                                                if (galleryInputRef.current) {
                                                    galleryInputRef.current.value = '';
                                                }

                                                handlePhotoSelected(event.target.files?.[0] ?? null);
                                            }}
                                        />
                                        <Input
                                            ref={galleryInputRef}
                                            id="submitted_photo_upload"
                                            type="file"
                                            accept="image/jpeg,image/png,image/webp"
                                            className="sr-only"
                                            onChange={(event) => {
                                                const file = event.target.files?.[0] ?? null;

                                                if (file && cameraInputRef.current) {
                                                    const transfer = new DataTransfer();
                                                    transfer.items.add(file);
                                                    cameraInputRef.current.files = transfer.files;
                                                }

                                                handlePhotoSelected(file);
                                            }}
                                        />

                                        <div className="rounded-md border bg-card px-3 py-2 text-sm">
                                            <div className="flex items-start justify-between gap-3">
                                                <div className="min-w-0">
                                                    <div className="text-[11px] font-medium text-muted-foreground">{t('Selected photo')}</div>
                                                    <div className="mt-1 truncate font-medium">{photoState.name || t('No photo selected')}</div>
                                                    {photoState.sizeLabel ? <div className="mt-0.5 text-xs text-muted-foreground">{photoState.sizeLabel}</div> : null}
                                                </div>
                                                {photoState.valid ? <CheckCircle2 className="mt-1 size-4 shrink-0 text-emerald-600" /> : null}
                                            </div>
                                            <p className={photoState.valid ? 'mt-2 text-xs text-emerald-700' : 'mt-2 text-xs text-muted-foreground'}>
                                                {photoState.status}
                                            </p>
                                        </div>

                                        {progress ? (
                                            <div className="grid gap-1">
                                                <div className="flex items-center justify-between text-xs text-muted-foreground">
                                                    <span>{t('Uploading photo')}</span>
                                                    <span>{progress.percentage}%</span>
                                                </div>
                                                <div className="h-2 overflow-hidden rounded-full bg-muted">
                                                    <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${progress.percentage}%` }} />
                                                </div>
                                            </div>
                                        ) : null}
                                    </div>
                                    <InputError message={errors.submitted_photo} />
                                </div>

                                <div className="grid gap-2">
                                    <Label htmlFor="coach_remarks">{t('Remarks')}</Label>
                                    <Textarea id="coach_remarks" name="coach_remarks" rows={4} />
                                    <InputError message={errors.coach_remarks} />
                                </div>

                                <div className="sticky bottom-0 -mx-4 flex border-t bg-card/95 px-4 py-3 backdrop-blur sm:static sm:mx-0 sm:justify-end sm:border-t sm:bg-transparent sm:px-0 sm:pt-4 sm:backdrop-blur-none">
                                    <Button type="submit" disabled={processing || assignments.length === 0 || assignmentId === '' || (proofRequired && (!locationCaptured || !photoReady))} className="w-full sm:w-auto">
                                        <Save className="size-4" />
                                        {processing ? t('Submitting...') : t('Submit attendance')}
                                    </Button>
                                </div>
                            </>
                        )}
                    </Form>
                </div>
            </main>

            <Dialog open={cameraOpen} onOpenChange={(open) => (open ? openCamera() : closeCamera())}>
                <DialogContent className="sm:max-w-xl">
                    <DialogHeader>
                        <DialogTitle>{t('Capture proof photo')}</DialogTitle>
                        <DialogDescription>{t('Use the connected camera to capture attendance proof.')}</DialogDescription>
                    </DialogHeader>

                    <div className="overflow-hidden rounded-lg border bg-black">
                        <video ref={videoRef} autoPlay playsInline muted className="aspect-video w-full object-contain" />
                    </div>

                    {cameraStatus ? (
                        <div className="rounded-md border bg-muted px-3 py-2 text-sm text-muted-foreground">
                            {cameraStatus}
                        </div>
                    ) : null}

                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={closeCamera}>
                            {t('Cancel')}
                        </Button>
                        <Button type="button" onClick={captureCameraPhoto} disabled={cameraStatus !== null}>
                            <Camera className="size-4" />
                            {t('Use photo')}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}

function ReadOnlyLocationValue({ label, value, emptyLabel }: { label: string; value: string; emptyLabel: string }) {
    return (
        <div className="rounded-md border bg-card px-3 py-2">
            <div className="text-[11px] font-medium text-muted-foreground">{label}</div>
            <div className="mt-1 truncate text-sm font-medium tabular-nums">{value || emptyLabel}</div>
        </div>
    );
}

function formatFileSize(bytes: number): string {
    if (bytes < 1024 * 1024) {
        return `${Math.max(1, Math.round(bytes / 1024))} KB`;
    }

    return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function stopCameraStream(stream: MediaStream | null): void {
    stream?.getTracks().forEach((track) => track.stop());
}

function requestCurrentLocation(
    onSuccess: PositionCallback,
    onError: PositionErrorCallback,
    enableHighAccuracy: boolean,
): void {
    navigator.geolocation.getCurrentPosition(onSuccess, onError, {
        enableHighAccuracy,
        maximumAge: enableHighAccuracy ? 0 : 300_000,
        timeout: enableHighAccuracy ? 20_000 : 30_000,
    });
}

function watchCurrentLocation(
    onSuccess: PositionCallback,
    onError: (error: GeolocationPositionError | null) => void,
    enableHighAccuracy = false,
): void {
    let settled = false;
    let lastError: GeolocationPositionError | null = null;
    const watchId = navigator.geolocation.watchPosition(
        (position) => {
            if (settled) {
                return;
            }

            settled = true;
            navigator.geolocation.clearWatch(watchId);
            onSuccess(position);
        },
        (error) => {
            lastError = error;
        },
        {
            enableHighAccuracy,
            maximumAge: 300_000,
            timeout: 45_000,
        },
    );

    window.setTimeout(() => {
        if (settled) {
            return;
        }

        settled = true;
        navigator.geolocation.clearWatch(watchId);
        onError(lastError);
    }, 45_000);
}

function locationErrorMessage(error: GeolocationPositionError, t: (key: string) => string): string {
    if (isLocationFixUnavailable(error)) {
        return [
            t('Unable to get current location. iOS could not get a GPS fix yet.'),
            t('Please open in an outdoor area, keep location services on, and try again.'),
        ].join(' ');
    }

    if (error.code === 1) {
        return t('Location permission was denied. Please allow location access and try again.');
    }

    if (error.code === 2) {
        return [t('Unable to get current location. Please turn on GPS/location services and try from an open area.'), error.message]
            .filter(Boolean)
            .join(' ');
    }

    if (error.code === 3) {
        return t('Location request timed out. Please try again in an open area.');
    }

    return t('Unable to get current location. Please try again.');
}

function isLocationFixUnavailable(error: { message: string }): boolean {
    return error.message.toLowerCase().includes('kclerrorlocationunknown');
}

function isSecureLocationContext(): boolean {
    if (typeof window === 'undefined') {
        return true;
    }

    return window.isSecureContext || ['localhost', '127.0.0.1', '::1'].includes(window.location.hostname);
}

function getSecureLocationUrl(): string | null {
    if (typeof window === 'undefined' || window.location.protocol === 'https:') {
        return null;
    }

    return `https://${window.location.host}${window.location.pathname}${window.location.search}`;
}

function todayIsoDate(): string {
    const date = new Date();
    const localDate = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);

    return localDate.toISOString().slice(0, 10);
}
