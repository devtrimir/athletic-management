import { Head, setLayoutProps, useForm } from '@inertiajs/react';
import { index as tournamentsIndex, store as storeTournament } from '@/actions/App/Http/Controllers/TournamentController';
import { Combobox } from '@/components/combobox';
import { DatePicker } from '@/components/date-picker';
import Heading from '@/components/heading';
import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useTranslation } from '@/hooks/use-translation';

type Session = { id: number; name: string };
type Sport = { id: number; name: string };
type Tier = { id: number; code: string; label: string };

type FormData = {
    name_hi: string;
    session_id: string;
    tier_id: string;
    sport_id: string;
    date_from: string;
    date_to: string;
    venue: string;
    raw_date_text: string;
};

export default function TournamentsCreate({
    sessions,
    sports,
    tiers,
}: {
    sessions: Session[];
    sports: Sport[];
    tiers: Tier[];
}) {
    const { t } = useTranslation();

    setLayoutProps({
        breadcrumbs: [
            { title: t('Tournaments'), href: tournamentsIndex.url() },
            { title: t('New tournament') },
        ],
    });

    const { data, setData, post, errors, processing } = useForm<FormData>({
        name_hi: '',
        session_id: '',
        tier_id: '',
        sport_id: '',
        date_from: '',
        date_to: '',
        venue: '',
        raw_date_text: '',
    });

    function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        post(storeTournament.url());
    }

    return (
        <>
            <Head title={t('New tournament')} />

            <div className="space-y-6">
                <Heading variant="small" title={t('New tournament')} description={t('Create tournament')} />

                <form onSubmit={handleSubmit} className="max-w-2xl space-y-6">
                    <div className="rounded-xl border bg-card p-6 space-y-5">
                        {/* Name */}
                        <div className="grid gap-2">
                            <Label htmlFor="name_hi">
                                {t('Name (Hindi)')} <span className="text-destructive">*</span>
                            </Label>
                            <Input
                                id="name_hi"
                                value={data.name_hi}
                                onChange={(e) => setData('name_hi', e.target.value)}
                                maxLength={255}
                                required
                            />
                            <InputError message={errors.name_hi} />
                        </div>

                        <div className="grid gap-5 sm:grid-cols-2">
                            {/* Session */}
                            <div className="grid gap-2">
                                <Label htmlFor="session_id">
                                    {t('Session')} <span className="text-destructive">*</span>
                                </Label>
                                <Combobox
                                    id="session_id"
                                    value={data.session_id}
                                    onValueChange={(v) => setData('session_id', v)}
                                    items={sessions.map((s) => ({ value: String(s.id), label: s.name }))}
                                    placeholder={t('Select session')}
                                    searchPlaceholder={t('Search sessions…')}
                                />
                                <InputError message={errors.session_id} />
                            </div>

                            {/* Tier */}
                            <div className="grid gap-2">
                                <Label htmlFor="tier_id">
                                    {t('Tier')} <span className="text-destructive">*</span>
                                </Label>
                                <Combobox
                                    id="tier_id"
                                    value={data.tier_id}
                                    onValueChange={(v) => setData('tier_id', v)}
                                    items={tiers.map((tier) => ({ value: String(tier.id), label: tier.label }))}
                                    placeholder={t('Select tier')}
                                    searchPlaceholder={t('Search tiers…')}
                                />
                                <InputError message={errors.tier_id} />
                            </div>

                            {/* Sport */}
                            <div className="grid gap-2">
                                <Label htmlFor="sport_id">{t('Sport')}</Label>
                                <Combobox
                                    id="sport_id"
                                    value={data.sport_id}
                                    onValueChange={(v) => setData('sport_id', v)}
                                    items={sports.map((sp) => ({ value: String(sp.id), label: sp.name }))}
                                    placeholder={t('All sports')}
                                    searchPlaceholder={t('Search sports…')}
                                />
                                <InputError message={errors.sport_id} />
                            </div>

                            {/* Venue */}
                            <div className="grid gap-2">
                                <Label htmlFor="venue">{t('Venue')}</Label>
                                <Input
                                    id="venue"
                                    value={data.venue}
                                    onChange={(e) => setData('venue', e.target.value)}
                                    maxLength={255}
                                />
                                <InputError message={errors.venue} />
                            </div>

                            {/* Date from */}
                            <div className="grid gap-2">
                                <Label htmlFor="date_from">{t('Date from')}</Label>
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
                            <Label htmlFor="raw_date_text">{t('Raw date text')}</Label>
                            <Textarea
                                id="raw_date_text"
                                value={data.raw_date_text}
                                onChange={(e) => setData('raw_date_text', e.target.value)}
                                maxLength={500}
                                rows={2}
                            />
                            <InputError message={errors.raw_date_text} />
                        </div>
                    </div>

                    <div className="flex gap-3">
                        <Button type="submit" disabled={processing}>
                            {processing ? t('Saving…') : t('Create tournament')}
                        </Button>
                        <Button variant="outline" type="button" asChild>
                            <a href={tournamentsIndex.url()}>{t('Cancel')}</a>
                        </Button>
                    </div>
                </form>
            </div>
        </>
    );
}

