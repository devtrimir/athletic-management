import { Head, usePage, setLayoutProps, useForm } from '@inertiajs/react';
import {
    index as tournamentsIndex,
    show as showTournament,
    update as updateTournament,
} from '@/actions/App/Http/Controllers/TournamentController';
import { Combobox } from '@/components/combobox';
import { DatePicker } from '@/components/date-picker';
import Heading from '@/components/heading';
import InputError from '@/components/input-error';
import { SportsMultiSelect } from '@/components/sports-multi-select';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useTranslation } from '@/hooks/use-translation';

type Session = { id: number; name: string };
type Sport = { id: number; name: string };
type Tier = { id: number; code: string; label: string };

type TournamentProp = {
    id: number;
    name: string;
    venue: string | null;
    date_from: string | null;
    date_to: string | null;
    raw_date_text: string | null;
    session: Session | null;
    tier: { id: number; code: string; label: string } | null;
    sport: Sport | null;
    sports: Sport[];
};

type FormData = {
    name: string;
    session_id: string;
    tier_id: string;
    sport_ids: string[];
    date_from: string;
    date_to: string;
    venue: string;
    raw_date_text: string;
};

export default function TournamentsEdit({
    tournament,
    sessions,
    sports,
    tiers,
}: {
    tournament: TournamentProp;
    sessions: Session[];
    sports: Sport[];
    tiers: Tier[];
}) {
    const { t } = useTranslation();
    const { locale = 'en' } = usePage().props as { locale?: string };

    setLayoutProps({
        breadcrumbs: [
            { title: t('Tournaments'), href: tournamentsIndex.url() },
            { title: tournament.name, href: showTournament.url(tournament.id) },
            { title: t('Edit tournament') },
        ],
    });

    const { data, setData, put, errors, processing } = useForm<FormData>({
        name: tournament.name,
        session_id: tournament.session ? String(tournament.session.id) : '',
        tier_id: tournament.tier ? String(tournament.tier.id) : '',
        sport_ids:
            tournament.sports.length > 0
                ? tournament.sports.map((sport) => String(sport.id))
                : tournament.sport
                  ? [String(tournament.sport.id)]
                  : [],
        date_from: tournament.date_from ?? '',
        date_to: tournament.date_to ?? '',
        venue: tournament.venue ?? '',
        raw_date_text: tournament.raw_date_text ?? '',
    });

    const selectedSportCount = data.sport_ids.length;
    const selectedSports = data.sport_ids
        .map((id) => sports.find((sport) => String(sport.id) === id))
        .filter((sport): sport is Sport => Boolean(sport));
    const hasMinimumRequired = Boolean(
        data.name.trim() &&
        data.session_id &&
        data.tier_id &&
        selectedSportCount > 0,
    );

    function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        put(updateTournament.url(tournament.id));
    }

    return (
        <>
            <Head title={t('Edit tournament')} />

            <div className="space-y-6">
                <Heading
                    variant="small"
                    title={t('Edit tournament')}
                    description={t(
                        'Review and update tournament details, sports, and timing.',
                    )}
                />

                <form onSubmit={handleSubmit} className="max-w-2xl space-y-6">
                    <div className="space-y-5 rounded-xl border bg-card p-6">
                        <div className="space-y-1">
                            <h2 className="text-sm font-medium">
                                {t('Tournament details')}
                            </h2>
                            <p className="text-xs text-muted-foreground">
                                {t(
                                    'Adjust core identity details before editing events.',
                                )}
                            </p>
                        </div>

                        {/* Name */}
                        <div className="grid gap-2">
                            <Label htmlFor="name">
                                {t('Name')}{' '}
                                <span className="text-destructive">*</span>
                            </Label>
                            <Input
                                id="name"
                                value={data.name}
                                onChange={(e) =>
                                    setData('name', e.target.value)
                                }
                                maxLength={255}
                                required
                            />
                            <InputError message={errors.name} />
                        </div>

                        <div className="grid gap-5 sm:grid-cols-2">
                            {/* Session */}
                            <div className="grid gap-2">
                                <Label htmlFor="session_id">
                                    {t('Session')}{' '}
                                    <span className="text-destructive">*</span>
                                </Label>
                                <Combobox
                                    id="session_id"
                                    value={data.session_id}
                                    onValueChange={(v) =>
                                        setData('session_id', v)
                                    }
                                    items={sessions.map((s) => ({
                                        value: String(s.id),
                                        label: s.name,
                                    }))}
                                    placeholder={t('Select session')}
                                    searchPlaceholder={t('Search sessions…')}
                                />
                                <InputError message={errors.session_id} />
                            </div>

                            {/* Tier */}
                            <div className="grid gap-2">
                                <Label htmlFor="tier_id">
                                    {t('Tier')}{' '}
                                    <span className="text-destructive">*</span>
                                </Label>
                                <Combobox
                                    id="tier_id"
                                    value={data.tier_id}
                                    onValueChange={(v) => setData('tier_id', v)}
                                    items={tiers.map((tier) => ({
                                        value: String(tier.id),
                                        label: tier.label,
                                    }))}
                                    placeholder={t('Select tier')}
                                    searchPlaceholder={t('Search tiers…')}
                                />
                                <InputError message={errors.tier_id} />
                            </div>

                            {/* Venue */}
                            <div className="grid gap-2">
                                <Label htmlFor="venue">{t('Venue')}</Label>
                                <Input
                                    id="venue"
                                    value={data.venue}
                                    onChange={(e) =>
                                        setData('venue', e.target.value)
                                    }
                                    maxLength={255}
                                />
                                <InputError message={errors.venue} />
                            </div>
                        </div>

                        <div className="space-y-1 border-t pt-2">
                            <h2 className="text-sm font-medium">
                                {t('Event sports')}
                            </h2>
                            <p className="text-xs text-muted-foreground">
                                {t(
                                    'Choose all sports included in this tournament.',
                                )}
                            </p>
                        </div>

                        <div className="grid gap-2">
                            <div className="grid gap-2">
                                <Label htmlFor="sport_ids">
                                    {t('Sports')}{' '}
                                    <span className="text-destructive">*</span>
                                </Label>
                                <p className="text-xs text-muted-foreground">
                                    {selectedSportCount === 0
                                        ? t(
                                              'Pick at least one sport for this tournament.',
                                          )
                                        : `${selectedSportCount} ${selectedSportCount === 1 ? t('sport') : t('sports')} ${t('selected')}.`}
                                </p>
                                {selectedSports.length > 0 ? (
                                    <div className="grid gap-2 sm:grid-cols-2">
                                        <p className="text-xs font-medium text-muted-foreground">
                                            {t('Selected sports')}
                                        </p>
                                        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                                            {selectedSports.map((sport) => (
                                                <p
                                                    key={sport.id}
                                                    className="rounded-md border bg-muted px-2 py-1.5 text-sm"
                                                >
                                                    {sport.name}
                                                </p>
                                            ))}
                                        </div>
                                    </div>
                                ) : null}
                                <SportsMultiSelect
                                    id="sport_ids"
                                    value={data.sport_ids}
                                    onValueChange={(value) =>
                                        setData('sport_ids', value)
                                    }
                                    sports={sports}
                                    locale={locale}
                                    placeholder={t('Select sports')}
                                />
                                <InputError message={errors.sport_ids} />
                            </div>
                        </div>

                        <div className="space-y-1 border-t pt-2">
                            <h2 className="text-sm font-medium">
                                {t('Venue and timing')}
                            </h2>
                            <p className="text-xs text-muted-foreground">
                                {t(
                                    'Optional details help with planning and reporting.',
                                )}
                            </p>
                        </div>

                        <div className="grid gap-5 sm:grid-cols-2">
                            {/* Date from */}
                            <div className="grid gap-2">
                                <Label htmlFor="date_from">
                                    {t('Date from')}
                                </Label>
                                <DatePicker
                                    id="date_from"
                                    value={data.date_from}
                                    onChange={(v) => setData('date_from', v)}
                                />
                                <InputError message={errors.date_from} />
                            </div>

                            {/* Date to */}
                            <div className="grid gap-2">
                                <Label htmlFor="date_to">{t('Date to')}</Label>
                                <DatePicker
                                    id="date_to"
                                    value={data.date_to}
                                    onChange={(v) => setData('date_to', v)}
                                />
                                <InputError message={errors.date_to} />
                            </div>
                        </div>

                        {/* Raw date text */}
                        <div className="grid gap-2">
                            <Label htmlFor="raw_date_text">
                                {t('Raw date text')}
                            </Label>
                            <Textarea
                                id="raw_date_text"
                                value={data.raw_date_text}
                                onChange={(e) =>
                                    setData('raw_date_text', e.target.value)
                                }
                                maxLength={500}
                                rows={2}
                            />
                            <InputError message={errors.raw_date_text} />
                        </div>
                    </div>

                    <div className="flex gap-3">
                        <Button
                            type="submit"
                            disabled={processing || !hasMinimumRequired}
                        >
                            {processing ? t('Saving…') : t('Update tournament')}
                        </Button>
                        <Button variant="outline" type="button" asChild>
                            <a href={showTournament.url(tournament.id)}>
                                {t('Cancel')}
                            </a>
                        </Button>
                    </div>
                </form>
            </div>
        </>
    );
}
