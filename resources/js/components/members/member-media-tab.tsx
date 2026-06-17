import { useHttp } from '@inertiajs/react';
import { ChevronDown, Download, Grid2X2, LayoutList, Square, Trash2, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import MemberMediaController from '@/actions/App/Http/Controllers/Api/V1/MemberMediaController';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { useTranslation } from '@/hooks/use-translation';
import { Lightbox } from './media-lightbox';
import type { MediaFile } from './participation-media-sheet';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type EventMedia = {
    event: { id: number; name: string; sport: { id: number; name: string } | null } | null;
    media: MediaFile[];
    count: number;
};

type TournamentMedia = {
    tournament: {
        id: number;
        name: string;
        date_from: string | null;
        tier: { code: string; name: string } | null;
    } | null;
    events: EventMedia[];
    total: number;
};

type MediaResponse = {
    data: TournamentMedia[];
    total: number;
};

type ViewMode = 'grid' | 'list' | 'large';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatBytes(bytes: number): string {
    if (bytes < 1024) {
return `${bytes} B`;
}

    if (bytes < 1024 * 1024) {
return `${(bytes / 1024).toFixed(0)} KB`;
}

    return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

// ---------------------------------------------------------------------------
// View mode toggle (Finder-style toolbar)
// ---------------------------------------------------------------------------

function ViewModeToggle({ mode, onChange }: { mode: ViewMode; onChange: (m: ViewMode) => void }) {
    const { t } = useTranslation();
    const MODES: { key: ViewMode; icon: React.ReactNode; label: string }[] = [
        { key: 'grid',  icon: <Grid2X2 className="size-4" />,     label: t('Grid') },
        { key: 'list',  icon: <LayoutList className="size-4" />,  label: t('List') },
        { key: 'large', icon: <Square className="size-4" />,      label: t('Large') },
    ];

    return (
        <div className="flex items-center rounded-md border divide-x overflow-hidden">
            {MODES.map(({ key, icon, label }) => (
                <button
                    key={key}
                    type="button"
                    title={label}
                    onClick={() => onChange(key)}
                    className={`flex items-center justify-center px-3 py-1.5 transition-colors ${mode === key ? 'bg-primary text-primary-foreground' : 'bg-background hover:bg-muted text-muted-foreground'}`}
                >
                    {icon}
                    <span className="sr-only">{label}</span>
                </button>
            ))}
        </div>
    );
}

// ---------------------------------------------------------------------------
// Filter bar
// ---------------------------------------------------------------------------

type Filters = {
    tournament_id: string;
    sport_id: string;
    session_id: string;
    medal_type: string;
};

function FilterBar({
    filters,
    onChange,
    onReset,
    tournaments,
    sports,
    sessions,
    activeCount,
}: {
    filters: Filters;
    onChange: (key: keyof Filters, value: string) => void;
    onReset: () => void;
    tournaments: { id: number; name: string }[];
    sports: { id: number; name: string }[];
    sessions: { id: number; name: string }[];
    activeCount: number;
}) {
    const { t } = useTranslation();
    const MEDAL_OPTIONS = ['GOLD', 'SILVER', 'BRONZE', 'MERIT'];

    return (
        <div className="flex flex-wrap items-center gap-2">
            {/* Tournament */}
            <Select
                value={filters.tournament_id || '__all__'}
                onValueChange={(v) => onChange('tournament_id', v === '__all__' ? '' : v)}
            >
                <SelectTrigger className={`h-8 w-auto min-w-32 rounded-full border text-xs font-medium px-3 gap-1 ${filters.tournament_id ? 'border-primary/40 bg-primary/8 text-primary' : 'border-input text-muted-foreground'}`}>
                    <SelectValue placeholder={t('Tournament')} />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="__all__">{t('All Tournaments')}</SelectItem>
                    {tournaments.map((t2) => (
                        <SelectItem key={t2.id} value={String(t2.id)}>{t2.name}</SelectItem>
                    ))}
                </SelectContent>
            </Select>

            {/* Sport */}
            <Select
                value={filters.sport_id || '__all__'}
                onValueChange={(v) => onChange('sport_id', v === '__all__' ? '' : v)}
            >
                <SelectTrigger className={`h-8 w-auto min-w-28 rounded-full border text-xs font-medium px-3 gap-1 ${filters.sport_id ? 'border-primary/40 bg-primary/8 text-primary' : 'border-input text-muted-foreground'}`}>
                    <SelectValue placeholder={t('Sport')} />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="__all__">{t('All Sports')}</SelectItem>
                    {sports.map((sp) => (
                        <SelectItem key={sp.id} value={String(sp.id)}>{sp.name}</SelectItem>
                    ))}
                </SelectContent>
            </Select>

            {/* Session */}
            <Select
                value={filters.session_id || '__all__'}
                onValueChange={(v) => onChange('session_id', v === '__all__' ? '' : v)}
            >
                <SelectTrigger className={`h-8 w-auto min-w-28 rounded-full border text-xs font-medium px-3 gap-1 ${filters.session_id ? 'border-primary/40 bg-primary/8 text-primary' : 'border-input text-muted-foreground'}`}>
                    <SelectValue placeholder={t('Session')} />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="__all__">{t('All Sessions')}</SelectItem>
                    {sessions.map((s) => (
                        <SelectItem key={s.id} value={String(s.id)}>{s.name}</SelectItem>
                    ))}
                </SelectContent>
            </Select>

            {/* Medal type */}
            <Select
                value={filters.medal_type || '__all__'}
                onValueChange={(v) => onChange('medal_type', v === '__all__' ? '' : v)}
            >
                <SelectTrigger className={`h-8 w-auto min-w-28 rounded-full border text-xs font-medium px-3 gap-1 ${filters.medal_type ? 'border-primary/40 bg-primary/8 text-primary' : 'border-input text-muted-foreground'}`}>
                    <SelectValue placeholder={t('Medal')} />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="__all__">{t('All medals')}</SelectItem>
                    {MEDAL_OPTIONS.map((m) => (
                        <SelectItem key={m} value={m}>{t(m)}</SelectItem>
                    ))}
                </SelectContent>
            </Select>

            {activeCount > 0 && (
                <button
                    type="button"
                    onClick={onReset}
                    className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
                >
                    <X className="size-3" />
                    {t('Clear filters')} ({activeCount})
                </button>
            )}
        </div>
    );
}

// ---------------------------------------------------------------------------
// Grid thumbnail
// ---------------------------------------------------------------------------

function GridThumb({
    file,
    size,
    onOpen,
    onDelete,
    canDelete,
    deleting,
}: {
    file: MediaFile;
    size: 'sm' | 'lg';
    onOpen: () => void;
    onDelete: () => void;
    canDelete: boolean;
    deleting: boolean;
}) {
    const { t } = useTranslation();

    return (
        <div className={`group relative overflow-hidden rounded-lg border bg-muted ${size === 'lg' ? 'aspect-video' : 'aspect-square'}`}>
            <img
                src={file.url}
                alt={file.caption ?? file.original_name}
                className="size-full cursor-zoom-in object-cover transition-transform group-hover:scale-105"
                onClick={onOpen}
            />

            {/* Caption overlay */}
            {file.caption && (
                <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/70 to-transparent px-2 pb-2 pt-4">
                    <p className="text-[10px] leading-tight text-white truncate">{file.caption}</p>
                </div>
            )}

            {/* Action overlay */}
            <div className="absolute top-1.5 right-1.5 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <a
                    href={file.url}
                    download={file.original_name}
                    className="flex h-6 w-6 items-center justify-center rounded-full bg-black/60 text-white hover:bg-black/80"
                    onClick={(e) => e.stopPropagation()}
                    title={t('Download')}
                >
                    <Download className="size-3" />
                </a>
                {canDelete && (
                    <button
                        type="button"
                        disabled={deleting}
                        onClick={(e) => {
 e.stopPropagation(); onDelete();
}}
                        className="flex h-6 w-6 items-center justify-center rounded-full bg-destructive/80 text-white hover:bg-destructive"
                        title={t('Delete')}
                    >
                        <Trash2 className="size-3" />
                    </button>
                )}
            </div>
        </div>
    );
}

// ---------------------------------------------------------------------------
// List row
// ---------------------------------------------------------------------------

function ListRow({
    file,
    onOpen,
    onDelete,
    canDelete,
    deleting,
}: {
    file: MediaFile;
    onOpen: () => void;
    onDelete: () => void;
    canDelete: boolean;
    deleting: boolean;
}) {
    const { t } = useTranslation();

    return (
        <div className="group flex items-center gap-3 rounded-lg border bg-card px-3 py-2 hover:bg-muted/40 transition-colors">
            <div
                className="size-12 shrink-0 cursor-zoom-in overflow-hidden rounded-md border bg-muted"
                onClick={onOpen}
            >
                <img
                    src={file.url}
                    alt={file.caption ?? file.original_name}
                    className="size-full object-cover"
                />
            </div>

            <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium leading-tight">
                    {file.caption ?? file.original_name}
                </p>
                <p className="text-xs text-muted-foreground">
                    {formatBytes(file.size_bytes)} · {new Date(file.created_at).toLocaleDateString('hi-IN')}
                </p>
            </div>

            <div className="flex shrink-0 items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <a
                    href={file.url}
                    download={file.original_name}
                    className="flex h-8 w-8 items-center justify-center rounded-md hover:bg-muted"
                    title={t('Download')}
                >
                    <Download className="size-4 text-muted-foreground" />
                </a>
                {canDelete && (
                    <button
                        type="button"
                        disabled={deleting}
                        onClick={onDelete}
                        className="flex h-8 w-8 items-center justify-center rounded-md hover:bg-destructive/10 text-destructive"
                        title={t('Delete')}
                    >
                        <Trash2 className="size-4" />
                    </button>
                )}
            </div>
        </div>
    );
}

// ---------------------------------------------------------------------------
// Event media group (inside tournament accordion)
// ---------------------------------------------------------------------------

function EventGroup({
    eventMedia,
    viewMode,
    canDelete,
    onLightbox,
    onDelete,
    deletingId,
    allFiles,
    baseIndex,
}: {
    eventMedia: EventMedia;
    viewMode: ViewMode;
    canDelete: boolean;
    onLightbox: (files: MediaFile[], idx: number) => void;
    onDelete: (id: number) => void;
    deletingId: number | null;
    allFiles: MediaFile[];
    baseIndex: number;
}) {
    const { t } = useTranslation();

    return (
        <div className="space-y-3">
            <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground flex items-center gap-2">
                {eventMedia.event?.name ?? t('Unknown event')}
                {eventMedia.event?.sport && (
                    <span className="font-normal normal-case tracking-normal text-muted-foreground/70">
                        — {eventMedia.event.sport.name}
                    </span>
                )}
                <span className="ml-auto font-normal normal-case tracking-normal">
                    {eventMedia.count}
                </span>
            </h4>

            {viewMode === 'list' ? (
                <div className="space-y-1.5">
                    {eventMedia.media.map((file, i) => (
                        <ListRow
                            key={file.id}
                            file={file}
                            onOpen={() => onLightbox(allFiles, baseIndex + i)}
                            onDelete={() => onDelete(file.id)}
                            canDelete={canDelete}
                            deleting={deletingId === file.id}
                        />
                    ))}
                </div>
            ) : (
                <div className={`grid gap-3 ${viewMode === 'large' ? 'grid-cols-2' : 'grid-cols-3 sm:grid-cols-4'}`}>
                    {eventMedia.media.map((file, i) => (
                        <GridThumb
                            key={file.id}
                            file={file}
                            size={viewMode === 'large' ? 'lg' : 'sm'}
                            onOpen={() => onLightbox(allFiles, baseIndex + i)}
                            onDelete={() => onDelete(file.id)}
                            canDelete={canDelete}
                            deleting={deletingId === file.id}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}

// ---------------------------------------------------------------------------
// Main Media Tab
// ---------------------------------------------------------------------------

type MediaTabProps = {
    memberId: number;
    canDelete: boolean;
};

export function MemberMediaTab({ memberId, canDelete }: MediaTabProps) {
    const { t } = useTranslation();
    const [data, setData] = useState<MediaResponse | null>(null);
    const [viewMode, setViewMode] = useState<ViewMode>('grid');
    const [filters, setFilters] = useState<Filters>({ tournament_id: '', sport_id: '', session_id: '', medal_type: '' });
    const [lightbox, setLightbox] = useState<{ files: MediaFile[]; index: number } | null>(null);
    const [deletingId, setDeletingId] = useState<number | null>(null);
    const fetchedRef = useRef(false);

    const { get, processing } = useHttp<Record<string, never>, MediaResponse>({});

    function buildUrl(overrideFilters?: Partial<Filters>): string {
        const merged = { ...filters, ...overrideFilters };
        const params = new URLSearchParams();

        if (merged.tournament_id) {
params.set('filter[tournament_id]', merged.tournament_id);
}

        if (merged.sport_id) {
params.set('filter[sport_id]', merged.sport_id);
}

        if (merged.session_id) {
params.set('filter[session_id]', merged.session_id);
}

        if (merged.medal_type) {
params.set('filter[medal_type]', merged.medal_type);
}

        const base = MemberMediaController.url(memberId);
        const qs = params.toString();

        return qs ? `${base}?${qs}` : base;
    }

    function fetchMedia(overrideFilters?: Partial<Filters>) {
        get(buildUrl(overrideFilters), {
            onSuccess: (res) => {
                const r = res as unknown as MediaResponse;
                setData(r ?? { data: [], total: 0 });
            },
            onError: () => setData({ data: [], total: 0 }),
        });
    }

    // Load on mount
    useEffect(() => {
        if (!fetchedRef.current) {
            fetchedRef.current = true;
            fetchMedia();
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [memberId]);

    function handleFilterChange(key: keyof Filters, value: string) {
        const next = { ...filters, [key]: value };
        setFilters(next);
        fetchedRef.current = false;
        fetchMedia(next);
    }

    function handleFilterReset() {
        const cleared: Filters = { tournament_id: '', sport_id: '', session_id: '', medal_type: '' };
        setFilters(cleared);
        fetchedRef.current = false;
        fetchMedia(cleared);
    }

    async function handleDelete(mediaFileId: number, participationId: number) {
        setDeletingId(mediaFileId);

        try {
            const res = await fetch(`/participations/${participationId}/media/${mediaFileId}`, {
                method: 'DELETE',
                headers: {
                    'X-CSRF-TOKEN': (document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement)?.content ?? '',
                },
            });

            if (res.ok || res.status === 204) {
                setData((prev) => {
                    if (!prev) {
return prev;
}

                    return {
                        ...prev,
                        total: prev.total - 1,
                        data: prev.data.map((td) => ({
                            ...td,
                            total: td.total - td.events.reduce((acc, ev) => acc + ev.media.filter((f) => f.id === mediaFileId).length, 0),
                            events: td.events.map((ev) => ({
                                ...ev,
                                count: ev.count - ev.media.filter((f) => f.id === mediaFileId).length,
                                media: ev.media.filter((f) => f.id !== mediaFileId),
                            })).filter((ev) => ev.count > 0),
                        })).filter((td) => td.total > 0),
                    };
                });
            }
        } finally {
            setDeletingId(null);
        }
    }

    // Flatten all media files for lightbox navigation
    const allMediaFlat: MediaFile[] = (data?.data ?? []).flatMap((td) => td.events.flatMap((ev) => ev.media));

    // Derive unique tournaments/sports/sessions from full (unfiltered) data for filter dropdowns
    const uniqueTournaments = (data?.data ?? [])
        .filter((td) => td.tournament)
        .map((td) => td.tournament!)
        .filter((t2, i, arr) => arr.findIndex((x) => x.id === t2.id) === i);

    const uniqueSports = (data?.data ?? [])
        .flatMap((td) => td.events)
        .filter((ev) => ev.event?.sport)
        .map((ev) => ev.event!.sport!)
        .filter((s, i, arr) => arr.findIndex((x) => x.id === s.id) === i);

    const activeFilterCount = Object.values(filters).filter(Boolean).length;

    // ── Loading skeleton ──
    if (processing && !data) {
        return (
            <div className="space-y-4">
                <div className="flex flex-wrap items-center gap-3">
                    <Skeleton className="h-8 w-32 rounded-full" />
                    <Skeleton className="h-8 w-28 rounded-full" />
                    <Skeleton className="h-8 w-28 rounded-full" />
                </div>
                <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
                    {Array.from({ length: 8 }).map((_, i) => (
                        <Skeleton key={i} className="aspect-square rounded-lg" />
                    ))}
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {/* Toolbar: view mode + filters */}
            <div className="flex flex-wrap items-center gap-3">
                <ViewModeToggle mode={viewMode} onChange={setViewMode} />
                <FilterBar
                    filters={filters}
                    onChange={handleFilterChange}
                    onReset={handleFilterReset}
                    tournaments={uniqueTournaments}
                    sports={uniqueSports}
                    sessions={[]}
                    activeCount={activeFilterCount}
                />
                <span className="ml-auto text-xs text-muted-foreground">
                    {data?.total ?? 0} {t('photos')}
                </span>
            </div>

            {/* Empty state */}
            {!data || data.total === 0 ? (
                <div className="flex flex-col items-center gap-3 rounded-xl border-2 border-dashed py-16 text-center">
                    <div className="text-4xl">📷</div>
                    <p className="text-sm text-muted-foreground">
                        {activeFilterCount > 0 ? t('No photos match the current filters.') : t('No photos yet. Upload photos from the Events page.')}
                    </p>
                    {activeFilterCount > 0 && (
                        <button
                            type="button"
                            onClick={handleFilterReset}
                            className="text-xs text-primary hover:underline"
                        >
                            {t('Clear filters')}
                        </button>
                    )}
                </div>
            ) : (
                <div className="space-y-2">
                    {data.data.map((tournamentData, tIdx) => (
                        <Collapsible key={tournamentData.tournament?.id ?? tIdx} defaultOpen>
                            <CollapsibleTrigger className="group flex w-full items-center gap-2 rounded-lg bg-muted/50 px-4 py-3 text-left hover:bg-muted/80 transition-colors">
                                <ChevronDown className="size-4 text-muted-foreground transition-transform group-data-[state=open]:rotate-180" />
                                <div className="flex-1 min-w-0">
                                    <span className="font-semibold text-sm truncate">
                                        {tournamentData.tournament?.name ?? t('Unknown tournament')}
                                    </span>
                                    {tournamentData.tournament?.tier && (
                                        <span className="ml-2 text-xs text-muted-foreground">
                                            {tournamentData.tournament.tier.name}
                                        </span>
                                    )}
                                    {tournamentData.tournament?.date_from && (
                                        <span className="ml-2 text-xs text-muted-foreground">
                                            {new Date(tournamentData.tournament.date_from).getFullYear()}
                                        </span>
                                    )}
                                </div>
                                <span className="shrink-0 text-xs text-muted-foreground">
                                    {tournamentData.total} {t('photos')}
                                </span>
                            </CollapsibleTrigger>

                            <CollapsibleContent>
                                <div className="mt-3 space-y-6 px-1">
                                    {tournamentData.events.map((eventMedia, eIdx) => {
                                        const baseIndex = allMediaFlat.indexOf(eventMedia.media[0]);

                                        return (
                                            <EventGroup
                                                key={eventMedia.event?.id ?? eIdx}
                                                eventMedia={eventMedia}
                                                viewMode={viewMode}
                                                canDelete={canDelete}
                                                onLightbox={(files, idx) => setLightbox({ files, index: idx })}
                                                onDelete={(id) => void handleDelete(id, 0)}
                                                deletingId={deletingId}
                                                allFiles={allMediaFlat}
                                                baseIndex={baseIndex < 0 ? 0 : baseIndex}
                                            />
                                        );
                                    })}
                                </div>
                            </CollapsibleContent>
                        </Collapsible>
                    ))}
                </div>
            )}

            {lightbox && (
                <Lightbox
                    files={lightbox.files}
                    index={lightbox.index}
                    onClose={() => setLightbox(null)}
                />
            )}
        </div>
    );
}
