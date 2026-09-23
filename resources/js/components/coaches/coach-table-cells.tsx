import { Link } from '@inertiajs/react';
import { IdCard } from 'lucide-react';
import CoachController from '@/actions/App/Http/Controllers/CoachController';
import { CoachAvatar } from '@/components/coaches/coach-avatar';
import type { Coach } from '@/components/coaches/coach-listing-types';
import {
    IconText,
    listingCellClass,
    listingHeadCellClass,
    listingTableClass,
    stickyLeftBodyCellClass,
    stickyLeftHeadCellClass,
} from '@/components/data-table/table-primitives';
import PlayerCoachBadge from '@/components/player-coach-badge';
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/components/ui/popover';
import { useTranslation } from '@/hooks/use-translation';

export {
    SelectionHeaderCheckbox,
    SelectionRowCheckbox,
    IconText,
} from '@/components/data-table/table-primitives';

export const coachTableClass = `${listingTableClass} min-w-[1140px]`;

export const coachHeadCellClass = listingHeadCellClass;

export const coachCellClass = listingCellClass;

export const teamGroupEndClass = 'border-b-2 border-b-primary/30';

/** Widths (px) for the leading select / S.No / Coach columns, shared by both listing tables. */
export const LEADING_COL_WIDTH = {
    select: 36,
    sno: 44,
    coach: 240,
} as const;

/** Left offsets (px) for the sticky select / S.No / Coach columns, derived from their widths. */
export const STICKY_LEFT = {
    select: 0,
    sno: LEADING_COL_WIDTH.select,
    coach: LEADING_COL_WIDTH.select + LEADING_COL_WIDTH.sno,
} as const;

/** Select + S.No columns — always the first two, in both tables. */
export function LeadingColgroup() {
    return (
        <>
            <col className="w-9" />
            <col className="w-11" />
        </>
    );
}

/** The Coach identity column's own width, placed wherever it falls in a table's column order. */
export function CoachColgroupCol() {
    return <col className="w-60" />;
}

export const stickyHeadCellClass = stickyLeftHeadCellClass;
export const stickyBodyCellClass = stickyLeftBodyCellClass;

export function CoachIdentity({
    id,
    name,
    rank,
    photoPath,
    memberId,
    member,
}: {
    id: number;
    name: string;
    rank: string | null;
    photoPath?: string | null;
    memberId?: number | null;
    member?: { full_name: string; pno: string | null } | null;
}) {
    return (
        <div className="flex min-w-0 items-center gap-1.5">
            <CoachAvatar photoPath={photoPath} name={name} />
            <div className="flex min-w-0 flex-wrap items-center gap-1">
                {rank && (
                    <span className="inline-flex shrink-0 items-center rounded-md bg-sky-500/10 px-1 py-0.5 text-[10px] leading-none font-medium text-sky-700 dark:text-sky-300">
                        {rank}
                    </span>
                )}
                <Link
                    href={CoachController.show.url(id)}
                    className="min-w-0 font-medium break-words text-primary hover:underline"
                    target="_blank"
                    rel="noopener noreferrer"
                >
                    {name}
                </Link>
                {memberId && (
                    <PlayerCoachBadge
                        memberId={memberId}
                        memberName={member?.full_name}
                        pno={member?.pno}
                        variant="compact"
                    />
                )}
            </div>
        </div>
    );
}

export function CoachPnoLink({ id, pno }: { id: number; pno: string | null }) {
    if (!pno) {
        return '-';
    }

    return (
        <Link
            href={CoachController.show.url(id)}
            className="block text-primary hover:underline"
            target="_blank"
            rel="noopener noreferrer"
        >
            <IconText
                icon={IdCard}
                iconClassName="text-sky-600 dark:text-sky-300"
            >
                {pno}
            </IconText>
        </Link>
    );
}

function coachSportSummary(
    sport: NonNullable<Coach['sports']>[number],
): string {
    return [
        sport.name,
        sport.level ?? sport.pivot?.level,
        sport.sport_event ?? sport.pivot?.sport_event,
        sport.notes ?? sport.pivot?.notes,
    ]
        .filter(Boolean)
        .join(' · ');
}

export function CoachSportsCell({ coach }: { coach: Coach }) {
    const { t } = useTranslation();
    const sports = coach.sports ?? [];

    if (sports.length === 0) {
        return '-';
    }

    const primary = sports.find((sport) => sport.is_primary) ?? sports[0];

    return (
        <Popover>
            <PopoverTrigger asChild>
                <button
                    type="button"
                    className="inline-flex max-w-full items-center gap-1.5 rounded-md px-1 py-0.5 text-left hover:bg-accent"
                >
                    <span className="truncate">{primary.name}</span>
                    {sports.length > 1 && (
                        <span className="shrink-0 rounded-md border px-1.5 py-0 text-[10px] text-muted-foreground">
                            +{sports.length - 1}
                        </span>
                    )}
                </button>
            </PopoverTrigger>
            <PopoverContent className="w-56 p-3">
                <div className="space-y-2">
                    <p className="text-xs font-medium text-muted-foreground">
                        {t('Sports')}
                    </p>
                    <ul className="space-y-2 text-sm">
                        {sports.map((sport) => (
                            <li key={sport.id} className="space-y-0.5">
                                <p className="font-medium">
                                    {sport.name}
                                    {sport.is_primary && (
                                        <span className="ml-1.5 text-[10px] font-normal text-muted-foreground">
                                            ({t('Primary')})
                                        </span>
                                    )}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                    {coachSportSummary(sport) || '—'}
                                </p>
                            </li>
                        ))}
                    </ul>
                </div>
            </PopoverContent>
        </Popover>
    );
}
