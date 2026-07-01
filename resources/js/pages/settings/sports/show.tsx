import { Head, Link, router, setLayoutProps } from '@inertiajs/react';
import {
    ArrowLeft,
    CheckCircle2,
    CircleOff,
    ListTree,
    Medal,
    Ruler,
    Search,
    Users,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import SportController from '@/actions/App/Http/Controllers/Settings/SportController';
import Heading from '@/components/heading';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
import { useTranslation } from '@/hooks/use-translation';

const CATEGORY_VARIANTS: Record<string, string> = {
    INDIVIDUAL:
        'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
    TEAM: 'bg-violet-100 text-violet-800 dark:bg-violet-900/30 dark:text-violet-300',
    COMBAT: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300',
    WATER: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900/30 dark:text-cyan-300',
};

type SportSwitcherItem = {
    id: number;
    name: string;
    code: string | null;
    category: string;
    sport_events_count: number;
    event_variants_count: number;
};

type SportVariant = {
    id: number;
    name: string;
    code: string;
    participation_format: string | null;
    gender_category: string | null;
    age_category: string | null;
    weight_category: string | null;
    measurement_unit: string | null;
    measurement_symbol: string | null;
    result_type: string | null;
    min_participants: number | null;
    max_participants: number | null;
    min_male_participants: number | null;
    max_male_participants: number | null;
    min_female_participants: number | null;
    max_female_participants: number | null;
    substitute_allowed: boolean;
    substitute_limit: number | null;
    is_team_based: boolean;
    is_medal_event: boolean;
    is_active: boolean;
};

type SportEvent = {
    id: number;
    name: string;
    code: string;
    discipline_type: string | null;
    is_active: boolean;
    variants_count: number;
    variants: SportVariant[];
};

type WeightCategory = {
    id: number;
    name: string;
    code: string;
    gender_category: string | null;
    min_weight: string | null;
    max_weight: string | null;
    is_active: boolean;
};

type Sport = SportSwitcherItem & {
    slug: string;
    description: string | null;
    is_active: boolean;
    sort_order: number;
    weight_categories_count: number;
    events: SportEvent[];
    weight_categories: WeightCategory[];
};

type EventDirectoryItem = {
    id: number;
    name: string;
    code: string | null;
    sport_id: number;
    sport_name: string | null;
    sport_code: string | null;
    team_variant_count: number;
    individual_variant_count: number;
};

function fallback(value: string | number | null | undefined): string {
    if (value === null || value === undefined || value === '') {
        return '-';
    }

    return String(value);
}

function participantRange(min: number | null, max: number | null): string {
    if (min === null && max === null) {
        return '-';
    }

    if (min !== null && max !== null && min === max) {
        return String(min);
    }

    return `${fallback(min)}-${fallback(max)}`;
}

function mixedComposition(variant: SportVariant): string {
    const male = participantRange(
        variant.min_male_participants,
        variant.max_male_participants,
    );
    const female = participantRange(
        variant.min_female_participants,
        variant.max_female_participants,
    );

    if (male === '-' && female === '-') {
        return '-';
    }

    return `M ${male} / F ${female}`;
}

function statItems(sport: Sport, t: (key: string) => string) {
    return [
        { label: t('Events'), value: sport.sport_events_count, icon: ListTree },
        {
            label: t('Variants'),
            value: sport.event_variants_count,
            icon: Medal,
        },
        {
            label: t('Weight categories'),
            value: sport.weight_categories_count,
            icon: Ruler,
        },
    ];
}

export default function Show({
    sport,
    sports,
    event_directory: eventDirectory,
}: {
    sport: Sport;
    sports: SportSwitcherItem[];
    event_directory: EventDirectoryItem[];
}) {
    const { t } = useTranslation();
    const [eventQuery, setEventQuery] = useState('');

    setLayoutProps({
        breadcrumbs: [
            {
                title: t('Sports'),
                href: SportController.index.url(),
            },
            {
                title: sport.name,
                href: SportController.show.url(sport.id),
            },
        ],
    });

    function changeSport(value: string) {
        const id = Number(value);

        if (id === sport.id) {
            return;
        }

        router.visit(SportController.show.url(id));
    }

    const filteredEvents = useMemo(() => {
        const query = eventQuery.trim().toLowerCase();

        if (query.length === 0) {
            return [];
        }

        return eventDirectory
            .filter((event) => {
                if (event.sport_id === sport.id) {
                    return false;
                }

                const name = event.name.toLowerCase();
                const code = event.code ? event.code.toLowerCase() : '';

                return name.includes(query) || code.includes(query);
            })
            .slice(0, 20);
    }, [eventQuery, eventDirectory, sport.id]);

    return (
        <>
            <Head title={sport.name} />

            <h1 className="sr-only">{sport.name}</h1>

            <div className="space-y-6">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div className="space-y-3">
                        <Button variant="outline" size="sm" asChild>
                            <Link href={SportController.index.url()}>
                                <ArrowLeft className="mr-1.5 h-4 w-4" />
                                {t('Back to sports')}
                            </Link>
                        </Button>

                        <Heading
                            variant="small"
                            title={sport.name}
                            description={
                                sport.description ??
                                t('No description recorded.')
                            }
                        />

                        <div className="flex flex-wrap gap-2">
                            {sport.code && (
                                <Badge variant="outline" className="font-mono">
                                    {sport.code}
                                </Badge>
                            )}
                            <Badge
                                variant="outline"
                                className={
                                    CATEGORY_VARIANTS[sport.category] ?? ''
                                }
                            >
                                {t(sport.category)}
                            </Badge>
                            <Badge
                                variant={
                                    sport.is_active ? 'default' : 'secondary'
                                }
                            >
                                {sport.is_active ? t('Active') : t('Inactive')}
                            </Badge>
                        </div>
                    </div>

                    <div className="grid gap-2 sm:min-w-80">
                        <span className="text-sm font-medium">
                            {t('Change sport')}
                        </span>
                        <Select
                            value={String(sport.id)}
                            onValueChange={changeSport}
                        >
                            <SelectTrigger>
                                <SelectValue placeholder={t('Select sport')} />
                            </SelectTrigger>
                            <SelectContent>
                                {sports.map((item) => (
                                    <SelectItem
                                        key={item.id}
                                        value={String(item.id)}
                                    >
                                        {item.name}
                                        {item.code ? ` (${item.code})` : ''}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                </div>

                <div className="grid gap-3 md:grid-cols-3">
                    {statItems(sport, t).map((item) => (
                        <div
                            key={item.label}
                            className="rounded-lg border bg-card p-4"
                        >
                            <div className="flex items-center justify-between gap-3">
                                <div>
                                    <p className="text-sm text-muted-foreground">
                                        {item.label}
                                    </p>
                                    <p className="mt-1 text-2xl font-semibold tabular-nums">
                                        {item.value}
                                    </p>
                                </div>
                                <item.icon className="h-5 w-5 text-muted-foreground" />
                            </div>
                        </div>
                    ))}
                </div>

                <section className="space-y-3">
                    <div className="rounded-lg border bg-card/50 p-4">
                        <label
                            className="mb-2 block text-sm font-medium"
                            htmlFor="event-search"
                        >
                            <span className="inline-flex items-center gap-2">
                                <Search className="h-4 w-4" />
                                {t('Find event')}
                            </span>
                        </label>
                        <Input
                            id="event-search"
                            value={eventQuery}
                            onChange={(e) => setEventQuery(e.target.value)}
                            placeholder={t('Search event by name or code…')}
                            className="mb-3"
                        />

                        {filteredEvents.length === 0 ? (
                            <p className="text-sm text-muted-foreground">
                                {eventQuery.trim() === ''
                                    ? t('Search event by name or code…')
                                    : t('No matching event.')}
                            </p>
                        ) : (
                            <div className="space-y-2">
                                <p className="text-sm text-muted-foreground">
                                    {t('Matches in other sports')}
                                </p>
                                <div className="space-y-2">
                                    {filteredEvents.map((event) => (
                                        <div
                                            key={event.id}
                                            className="flex flex-col gap-2 border p-2.5 sm:flex-row sm:items-center sm:justify-between"
                                        >
                                            <div className="space-y-1">
                                                <p className="text-sm font-medium">
                                                    {event.name}
                                                </p>
                                                <p className="text-xs text-muted-foreground">
                                                    {event.code}
                                                    {event.sport_name
                                                        ? ` • ${event.sport_name}`
                                                        : ''}
                                                    {event.sport_code
                                                        ? ` (${event.sport_code})`
                                                        : ''}
                                                </p>
                                                <div className="inline-flex gap-1">
                                                    {event.team_variant_count >
                                                    0 ? (
                                                        <Badge variant="outline">
                                                            {t('Team')}
                                                        </Badge>
                                                    ) : null}
                                                    {event.individual_variant_count >
                                                    0 ? (
                                                        <Badge variant="outline">
                                                            {t('Individual')}
                                                        </Badge>
                                                    ) : null}
                                                    {event.team_variant_count ===
                                                        0 &&
                                                    event.individual_variant_count ===
                                                        0 ? (
                                                        <Badge variant="outline">
                                                            {t(
                                                                'No variants recorded.',
                                                            )}
                                                        </Badge>
                                                    ) : null}
                                                </div>
                                            </div>
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => {
                                                    router.visit(
                                                        SportController.show.url(
                                                            event.sport_id,
                                                        ),
                                                    );
                                                }}
                                            >
                                                {t('Go to sport')}
                                            </Button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="flex items-center justify-between gap-3">
                        <h2 className="text-base font-semibold">
                            {t('Events and variants')}
                        </h2>
                        <Badge variant="outline">{t('Read only')}</Badge>
                    </div>

                    {sport.events.length === 0 ? (
                        <div className="rounded-lg border py-12 text-center text-muted-foreground">
                            {t('No sport events recorded.')}
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {sport.events.map((event) => (
                                <div
                                    key={event.id}
                                    className="overflow-hidden rounded-lg border"
                                >
                                    <div className="flex flex-col gap-2 bg-muted/40 px-4 py-3 md:flex-row md:items-center md:justify-between">
                                        <div>
                                            <div className="flex flex-wrap items-center gap-2">
                                                <h3 className="font-medium">
                                                    {event.name}
                                                </h3>
                                                <Badge
                                                    variant="outline"
                                                    className="font-mono"
                                                >
                                                    {event.code}
                                                </Badge>
                                                {event.discipline_type && (
                                                    <Badge variant="secondary">
                                                        {event.discipline_type}
                                                    </Badge>
                                                )}
                                            </div>
                                            <p className="mt-1 text-sm text-muted-foreground">
                                                {t('Variants')}:{' '}
                                                {event.variants_count}
                                            </p>
                                        </div>
                                        <Badge
                                            variant={
                                                event.is_active
                                                    ? 'default'
                                                    : 'secondary'
                                            }
                                        >
                                            {event.is_active
                                                ? t('Active')
                                                : t('Inactive')}
                                        </Badge>
                                    </div>

                                    {event.variants.length === 0 ? (
                                        <div className="px-4 py-8 text-center text-sm text-muted-foreground">
                                            {t('No variants recorded.')}
                                        </div>
                                    ) : (
                                        <div className="overflow-x-auto">
                                            <Table>
                                                <TableHeader>
                                                    <TableRow>
                                                        <TableHead className="min-w-56">
                                                            {t('Variant')}
                                                        </TableHead>
                                                        <TableHead>
                                                            {t('Format')}
                                                        </TableHead>
                                                        <TableHead>
                                                            {t('Gender')}
                                                        </TableHead>
                                                        <TableHead>
                                                            {t(
                                                                'Category detail',
                                                            )}
                                                        </TableHead>
                                                        <TableHead>
                                                            {t('Result type')}
                                                        </TableHead>
                                                        <TableHead>
                                                            {t('Unit')}
                                                        </TableHead>
                                                        <TableHead>
                                                            {t('Participants')}
                                                        </TableHead>
                                                        <TableHead>
                                                            {t(
                                                                'Mixed composition',
                                                            )}
                                                        </TableHead>
                                                        <TableHead>
                                                            {t('Substitutes')}
                                                        </TableHead>
                                                        <TableHead>
                                                            {t('Flags')}
                                                        </TableHead>
                                                    </TableRow>
                                                </TableHeader>
                                                <TableBody>
                                                    {event.variants.map(
                                                        (variant) => (
                                                            <TableRow
                                                                key={variant.id}
                                                            >
                                                                <TableCell>
                                                                    <div className="space-y-1">
                                                                        <div className="font-medium">
                                                                            {
                                                                                variant.name
                                                                            }
                                                                        </div>
                                                                        <div className="font-mono text-xs text-muted-foreground">
                                                                            {
                                                                                variant.code
                                                                            }
                                                                        </div>
                                                                    </div>
                                                                </TableCell>
                                                                <TableCell>
                                                                    {fallback(
                                                                        variant.participation_format,
                                                                    )}
                                                                </TableCell>
                                                                <TableCell>
                                                                    {fallback(
                                                                        variant.gender_category,
                                                                    )}
                                                                </TableCell>
                                                                <TableCell>
                                                                    {fallback(
                                                                        variant.weight_category ??
                                                                            variant.age_category,
                                                                    )}
                                                                </TableCell>
                                                                <TableCell>
                                                                    {fallback(
                                                                        variant.result_type,
                                                                    )}
                                                                </TableCell>
                                                                <TableCell>
                                                                    {variant.measurement_unit
                                                                        ? `${variant.measurement_unit}${variant.measurement_symbol ? ` (${variant.measurement_symbol})` : ''}`
                                                                        : '-'}
                                                                </TableCell>
                                                                <TableCell>
                                                                    {participantRange(
                                                                        variant.min_participants,
                                                                        variant.max_participants,
                                                                    )}
                                                                </TableCell>
                                                                <TableCell>
                                                                    {mixedComposition(
                                                                        variant,
                                                                    )}
                                                                </TableCell>
                                                                <TableCell>
                                                                    {variant.substitute_allowed
                                                                        ? fallback(
                                                                              variant.substitute_limit,
                                                                          )
                                                                        : t(
                                                                              'No',
                                                                          )}
                                                                </TableCell>
                                                                <TableCell>
                                                                    <div className="flex flex-wrap gap-1">
                                                                        <Badge
                                                                            variant={
                                                                                variant.is_team_based
                                                                                    ? 'default'
                                                                                    : 'outline'
                                                                            }
                                                                        >
                                                                            <Users className="mr-1 h-3 w-3" />
                                                                            {variant.is_team_based
                                                                                ? t(
                                                                                      'Team',
                                                                                  )
                                                                                : t(
                                                                                      'Individual',
                                                                                  )}
                                                                        </Badge>
                                                                        <Badge
                                                                            variant={
                                                                                variant.is_medal_event
                                                                                    ? 'default'
                                                                                    : 'secondary'
                                                                            }
                                                                        >
                                                                            {variant.is_medal_event ? (
                                                                                <CheckCircle2 className="mr-1 h-3 w-3" />
                                                                            ) : (
                                                                                <CircleOff className="mr-1 h-3 w-3" />
                                                                            )}
                                                                            {variant.is_medal_event
                                                                                ? t(
                                                                                      'Medal event',
                                                                                  )
                                                                                : t(
                                                                                      'Non medal event',
                                                                                  )}
                                                                        </Badge>
                                                                        <Badge
                                                                            variant={
                                                                                variant.is_active
                                                                                    ? 'default'
                                                                                    : 'secondary'
                                                                            }
                                                                        >
                                                                            {variant.is_active
                                                                                ? t(
                                                                                      'Active',
                                                                                  )
                                                                                : t(
                                                                                      'Inactive',
                                                                                  )}
                                                                        </Badge>
                                                                    </div>
                                                                </TableCell>
                                                            </TableRow>
                                                        ),
                                                    )}
                                                </TableBody>
                                            </Table>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </section>

                {sport.weight_categories.length > 0 && (
                    <section className="space-y-3">
                        <h2 className="text-base font-semibold">
                            {t('Weight categories')}
                        </h2>
                        <div className="overflow-hidden rounded-lg border">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>{t('Name')}</TableHead>
                                        <TableHead>{t('Code')}</TableHead>
                                        <TableHead>{t('Gender')}</TableHead>
                                        <TableHead>{t('Weight')}</TableHead>
                                        <TableHead>{t('Status')}</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {sport.weight_categories.map((category) => (
                                        <TableRow key={category.id}>
                                            <TableCell className="font-medium">
                                                {category.name}
                                            </TableCell>
                                            <TableCell className="font-mono">
                                                {category.code}
                                            </TableCell>
                                            <TableCell>
                                                {fallback(
                                                    category.gender_category,
                                                )}
                                            </TableCell>
                                            <TableCell>
                                                {category.min_weight === null &&
                                                category.max_weight === null
                                                    ? '-'
                                                    : `${fallback(category.min_weight)}-${fallback(category.max_weight)} kg`}
                                            </TableCell>
                                            <TableCell>
                                                <Badge
                                                    variant={
                                                        category.is_active
                                                            ? 'default'
                                                            : 'secondary'
                                                    }
                                                >
                                                    {category.is_active
                                                        ? t('Active')
                                                        : t('Inactive')}
                                                </Badge>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    </section>
                )}
            </div>
        </>
    );
}
