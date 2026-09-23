import { UserRound } from 'lucide-react';
import {
    listingCellClass,
    listingHeadCellClass,
    listingTableClass,
    stickyLeftBodyCellClass,
    stickyLeftHeadCellClass,
    stickyRightBodyCellClass,
    stickyRightHeadCellClass,
} from '@/components/data-table/table-primitives';
import type { Member } from '@/components/members/member-listing-types';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/components/ui/popover';
import { useTranslation } from '@/hooks/use-translation';
import { playerCategoryLabel } from '@/lib/player-category';

export const memberTableClass = `${listingTableClass} min-w-[1180px]`;
export const memberHeadCellClass = listingHeadCellClass;
export const memberCellClass = listingCellClass;
export const memberStickyLeftHeadClass = stickyLeftHeadCellClass;
export const memberStickyLeftBodyClass = stickyLeftBodyCellClass;
export const memberStickyRightHeadClass = stickyRightHeadCellClass;
export const memberStickyRightBodyClass = stickyRightBodyCellClass;

/** Widths (px) for the leading select / Sr.no / Photo / Name columns. */
export const LEADING_COL_WIDTH = {
    select: 36,
    sno: 44,
    photo: 44,
    name: 220,
} as const;

/** Left offsets (px) for the sticky leading columns, derived from their widths. */
export const STICKY_LEFT = {
    select: 0,
    sno: LEADING_COL_WIDTH.select,
    photo: LEADING_COL_WIDTH.select + LEADING_COL_WIDTH.sno,
    name:
        LEADING_COL_WIDTH.select +
        LEADING_COL_WIDTH.sno +
        LEADING_COL_WIDTH.photo,
} as const;

export function LeadingColgroup() {
    return (
        <>
            <col className="w-9" />
            <col className="w-11" />
            <col className="w-11" />
            <col className="w-[220px]" />
        </>
    );
}

export const CATEGORY_BADGE_CLASS: Record<string, string> = {
    GD: 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-300',
    SPORTS_QUOTA:
        'border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-900/60 dark:bg-sky-950/40 dark:text-sky-300',
};

export const LEVEL_BADGE_CLASS: Record<string, string> = {
    ZONAL: 'border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-800 dark:bg-slate-900/50 dark:text-slate-300',
    AIPSC: 'border-violet-200 bg-violet-50 text-violet-700 dark:border-violet-900/60 dark:bg-violet-950/40 dark:text-violet-300',
    NATIONAL:
        'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-300',
    INTERNATIONAL:
        'border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-300',
};

export function genderLabel(
    value: string | null | undefined,
    t: (key: string) => string,
): string {
    switch (value) {
        case 'M':
            return t('Male');
        case 'F':
            return t('Female');
        case 'O':
            return t('Other gender');
        default:
            return value ?? '';
    }
}

export function postingLocation(member: Member): string | null {
    return member.current_unit?.name ?? member.posting_district?.name ?? null;
}

export function MemberAvatar({
    photoPath,
    name,
}: {
    photoPath?: string | null;
    name: string;
}) {
    return (
        <Avatar className="size-8 rounded-full border bg-muted">
            {photoPath && (
                <AvatarImage
                    src={`/storage/${photoPath}`}
                    alt={name}
                    className="object-cover"
                />
            )}
            <AvatarFallback className="rounded-full bg-transparent">
                <UserRound className="size-4 text-muted-foreground/60" />
            </AvatarFallback>
        </Avatar>
    );
}

export function MemberIdentity({
    name,
    rankLabel,
}: {
    name: string;
    rankLabel: string;
}) {
    return (
        <div className="flex min-w-0 flex-wrap items-center gap-1">
            {rankLabel && (
                <span className="inline-flex shrink-0 items-center rounded-md bg-sky-500/10 px-1 py-0.5 text-[10px] leading-none font-medium text-sky-700 dark:text-sky-300">
                    {rankLabel}
                </span>
            )}
            <span className="min-w-0 truncate font-medium">{name}</span>
        </div>
    );
}

function sportSummary(sport: Member['playable_sports'][number]): string {
    return [
        sport.name,
        sport.role ?? sport.pivot?.role,
        sport.sport_event ?? sport.pivot?.sport_event,
        sport.weight ?? sport.pivot?.weight,
        sport.position ?? sport.pivot?.position,
        sport.notes ?? sport.pivot?.notes,
    ]
        .filter(Boolean)
        .join(' · ');
}

export function SportCell({ member }: { member: Member }) {
    const { t } = useTranslation();
    const playableSports = member.playable_sports;

    if (playableSports.length === 0) {
        return <span className="text-border select-none">—</span>;
    }

    return (
        <Popover>
            <PopoverTrigger asChild>
                <button
                    type="button"
                    className="inline-flex max-w-full items-center gap-1.5 rounded-md px-1 py-0.5 text-left hover:bg-accent"
                    onClick={(e) => e.stopPropagation()}
                >
                    <span className="truncate">
                        {sportSummary(playableSports[0])}
                    </span>
                    {playableSports.length > 1 && (
                        <Badge
                            variant="outline"
                            className="shrink-0 px-1.5 py-0 text-[10px]"
                        >
                            +{playableSports.length - 1}
                        </Badge>
                    )}
                </button>
            </PopoverTrigger>
            <PopoverContent
                className="w-56 p-3"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="space-y-2">
                    <div>
                        <p className="text-xs font-medium text-muted-foreground">
                            {t('Sports')}
                        </p>
                        <ul className="mt-1 space-y-2 text-sm">
                            {playableSports.map((sport) => (
                                <li key={sport.id} className="space-y-0.5">
                                    <p className="font-medium">{sport.name}</p>
                                    <div className="space-y-0.5 text-xs text-muted-foreground">
                                        {(sport.role ?? sport.pivot?.role) && (
                                            <p>
                                                <span className="font-medium text-foreground">
                                                    {t('Role / position')}:
                                                </span>{' '}
                                                {sport.role ??
                                                    sport.pivot?.role}
                                            </p>
                                        )}
                                        {(sport.position ??
                                            sport.pivot?.position) && (
                                            <p>
                                                <span className="font-medium text-foreground">
                                                    {t('Position')}:
                                                </span>{' '}
                                                {sport.position ??
                                                    sport.pivot?.position}
                                            </p>
                                        )}
                                        {(sport.sport_event ??
                                            sport.pivot?.sport_event) && (
                                            <p>
                                                <span className="font-medium text-foreground">
                                                    {t('Sport event')}:
                                                </span>{' '}
                                                {sport.sport_event ??
                                                    sport.pivot?.sport_event}
                                            </p>
                                        )}
                                        {(sport.weight ??
                                            sport.pivot?.weight) && (
                                            <p>
                                                <span className="font-medium text-foreground">
                                                    {t('Weight')}:
                                                </span>{' '}
                                                {sport.weight ??
                                                    sport.pivot?.weight}
                                            </p>
                                        )}
                                        {(sport.notes ??
                                            sport.pivot?.notes) && (
                                            <p>
                                                <span className="font-medium text-foreground">
                                                    {t('Notes')}:
                                                </span>{' '}
                                                {sport.notes ??
                                                    sport.pivot?.notes}
                                            </p>
                                        )}
                                        {!sport.role &&
                                            !sport.pivot?.role &&
                                            !sport.position &&
                                            !sport.pivot?.position &&
                                            !sport.sport_event &&
                                            !sport.pivot?.sport_event &&
                                            !sport.weight &&
                                            !sport.pivot?.weight &&
                                            !sport.notes &&
                                            !sport.pivot?.notes && <p>—</p>}
                                    </div>
                                </li>
                            ))}
                        </ul>
                    </div>
                </div>
            </PopoverContent>
        </Popover>
    );
}

export function CategoryBadge({
    category,
    normalizedKey,
}: {
    category: string;
    normalizedKey: string | null;
}) {
    const { t } = useTranslation();

    return (
        <Badge
            variant="outline"
            className={CATEGORY_BADGE_CLASS[normalizedKey ?? category]}
        >
            {playerCategoryLabel(category, t)}
        </Badge>
    );
}

export function LevelBadge({ level, label }: { level: string; label: string }) {
    return (
        <Badge variant="outline" className={LEVEL_BADGE_CLASS[level]}>
            {label}
        </Badge>
    );
}
